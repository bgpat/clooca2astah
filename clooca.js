const fs = require('fs');
const path = require('path');
const util = require('util');
const xml2js = require('xml2js');
const svg2png = require('svg2png');

const tags = ['circle', 'rect', 'line', 'path', 'text'];
const labels = {
  '前進': '前進',
  '停止': '停止',
  '右旋回': '右旋回',
  '左旋回': '左旋回',
  '線から出た': '白線を検知',
  '線に入った': '黒線を検知',
  '荷物が載った': '荷物が載った',
  '荷物がなくなった': '荷物が落ちた',
  '黒色を検知': '黒線を検知',
  '白色を検知': '白線を検知',
  '荷物が落ちた': '荷物が落ちた',
  'M0.5625 -3.375 Q2.25 -4.7344 3 -7.0781 L3.9375 -6.75 Q4.2188 -6.': '荷物が載った',
  'M0.6562 -1.9844 L1.6719 -2.0781 Q1.7969 -1.3594 2.1641 -1.0391 Q': '90*に回る',
  'M2.6719 -6.4688 L2.8594 -6.375 Q3 -6.2344 2.7656 -6.0938 L2.7656': '停止',
  'M2.6719 5.5957 L2.8594 5.6895 Q3 5.8301 2.7656 5.9707 L2.7656 13': '停止',
  'M3.1875 -0.9844 Q2.6719 0 1.7344 1.125 L0.8906 0.4219 Q1.7344 -0': '黒線を検知',
  'M3.5625 -8.625 L3.8125 -8.5 Q4 -8.3125 3.6875 -8.125 L3.6875 1.4': '停止',
  'M4.5938 -4.5469 L4.5938 -5.4844 L2.5312 -5.4844 L2.5312 -4.5469 ': '前進',
  'M4.5938 7.5176 L4.5938 6.5801 L2.5312 6.5801 L2.5312 7.5176 L4.5': '前進',
  'M5.2969 -7.7344 L11.0625 -7.7344 L11.0625 -6.8438 L5.0625 -6.843': '右旋回',
  'M5.2969 4.3301 L11.0625 4.3301 L11.0625 5.2207 L5.0625 5.2207 Q4': '右旋回',
  'M6.125 -6.0625 L6.125 -7.3125 L3.375 -7.3125 L3.375 -6.0625 L6.1': '前進',
  'M7.0625 -10.3125 L14.75 -10.3125 L14.75 -9.125 L6.75 -9.125 Q6.1': '右旋回',
  'M9.2344 -3.375 L2.8125 -3.375 L2.8125 -0.8438 L9.2344 -0.8438 L9': '白線を検知',
  'M10.9219 -7.7812 L10.9219 -6.75 L5.3906 -6.75 Q5.3438 -6.2344 4.': '左旋回',
  'M10.9219 4.2832 L10.9219 5.3145 L5.3906 5.3145 Q5.3438 5.8301 4.': '左旋回',
  'M14.5625 -10.375 L14.5625 -9 L7.1875 -9 Q7.125 -8.3125 6.4375 -6': '左旋回',
};

function find(g, parent, ...transform) {
  let res = {};
  tags.map(t => (res[t] = [], t)).forEach(t => {
    if (g[t] == null) {
      return;
    }
    res[t].push(...g[t].filter($ => $).map($ => {
      let tf = {};
      [...transform, g.$ && g.$.transform].filter($ => $).map($ => {
        $.match(/\w+\([^)]*\)/g).map(s => s.match(/(\w+)\(([^)]*)\)/)).forEach(([_, k, v]) => {
          v = v.split(/,| /).map(n => +n);
          if (v.length === 1) {
            v.push(0);
          }
          if (tf[k] == null) {
            tf[k] = v;
            return;
          }
          switch (k) {
            case 'translate':
              tf.translate[0] += v[0];
              tf.translate[1] += v[1];
              break
            case 'scale':
              tf.scale[0] *= v[0];
              tf.scale[1] *= v[1];
              break;
          }
        });
      });
      return Object.assign($.$, {
        transform: tf,
        content: $._,
        parent,
        original: $,
      });
    }).filter($ => $));
  });
  if (Array.isArray(g)) {
    g.map(($, i) => find($, Object.assign({
      parent,
    }, $), ...transform)).map($ => tags.forEach(t => {
      if ($[t] == null) {
        return;
      }
      res[t].push(...$[t]);
    }));
  }
  if (g.g != null) {
    Object.entries(find(g.g, parent, ...transform, g.$ && g.$.transform)).forEach(([k, v]) => {
      if (res[k] == null) {
        res[k] = [];
      }
      res[k].push(...v);
    });
  }
  return res;
}

function parse(file) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(fs.readFileSync(file).toString(), (err, doc) => {
      if (err != null) {
        return reject(err);
      }
      const svg = find(doc.svg.g);
      if (svg.text.length === 0) {
        let start = svg.circle.shift();
        start = {
          x: +start.cx + (start.transform.translate && start.transform.translate[0] || 0),
          y: +start.cy + (start.transform.translate && start.transform.translate[1] || 0),
          r: +start.r,
          distance(p) {
            return (this.x - p.x) * (this.x - p.x) + (this.y - p.y) * (this.y - p.y) - this.r * this.r;
          },
        };

        let nodes = svg.rect.filter(rect => rect.rx && !~rect.style.indexOf('stroke:none')).map(($, i) => {
          let res = {
            index: i + 1,
            x: +$.x,
            y: +$.y,
            width: +$.width,
            height: +$.height,
            label: '',
            distance(p) {
              let x1 = this.x - p.x;
              let y1 = this.y - p.y;
              let x2 = this.x + this.width - p.x;
              let y2 = this.y + this.height - p.y;
              let x1s = x1 * x1;
              let y1s = y1 * y1;
              let x2s = x2 * x2;
              let y2s = y2 * y2;
              let d = [x1s + y1s, x1s + y2s, x2s + y1s, x2s + y2s];
              x1 < 0 && 0 < x2 && d.push(y1s, y2s);
              y1 < 0 && 0 < y2 && d.push(x1s, x2s);
              return Math.min(...d);
            },
          };
          let label = svg.path.filter(p => ~p.parent.$.style.indexOf('text-rendering:optimizeLegibility')).
            map(p => Object.assign(p, {
              translate: {
                x: p.transform.translate[0],
                y: p.transform.translate[1],
              },
            })).
            sort((a, b) => {
              return res.distance(a.translate) - res.distance(b.translate);
            }).shift();
          if (label != null) {
            res.label = labels[label.d.slice(0,  64)];
            /*
            const p = label.d.match(/-?\d+(\.\d+)?[ ,]-?\d+(\.\d+)?/g).map(s => s.split(/ |,/));
            const rect = {
              l: Math.min(...p.map($ => +$[0])),
              t: Math.min(...p.map($ => +$[1])),
              r: Math.max(...p.map($ => +$[0])),
              b: Math.max(...p.map($ => +$[1])),
            };
            const builder = new xml2js.Builder({ rootName: 'svg' });
            let svg = builder.buildObject({
              $: {
                xmlns: 'http://www.w3.org/2000/svg',
                viewBox: [rect.l, rect.t, rect.r - rect.l + 1, rect.b - rect.t + 1].join(' '),
                width: rect.r - rect.l + 1 << 4,
                height: rect.b - rect.t + 1 << 4,
              },
              path: {
                $: {
                  d: label.d,
                },
              },
            });
            let png = `/tmp/${label.d.slice(0, 64)}.png`;
            svg2png(svg).then(buf => {
              fs.writeFileSync(png, buf);
            });
            */
          }
          return res;
        });

        let edges = [
          ...[].concat(...svg.line.filter($ => $.parent.line[0] == $.original).
            filter($ => !$.parent.rect && ~$.parent.$.style.indexOf('shape-rendering:crispEdges')).
            map($ => $.parent.line.reduce((edges, l) => {
              let curr = edges.pop();
              if (curr.length == 0) {
                curr.push({
                  x: +l.$.x1,
                  y: +l.$.y1,
                }, {
                  x: +l.$.x2,
                  y: +l.$.y2,
                });
              } else {
                let prev = curr.pop();
                if (prev.x == l.$.x1 && prev.y == l.$.y1) {
                  curr.push(prev, {
                    x: +l.$.x2,
                    y: +l.$.y2,
                  });
                } else {
                  let prev2 = curr.pop();
                  if (prev2.x == l.$.x1 && prev2.y == l.$.y1) {
                    edges.push([...curr, prev2]);
                  }
                  curr = [];
                }
              }
              return [...edges, curr];
            }, [[]]).slice(0, -1))).map(p => {
              let from = p[0];
              let to = p[p.length - 1];
              return {
                from: [...nodes, start].sort((a, b) => a.distance(from) - b.distance(from)).shift(),
                to: [...nodes, start].sort((a, b) => a.distance(to) - b.distance(to)).shift(),
                path: p,
                shape: 'line',
                label: '',
                distance(p) {
                  return Math.min(...this.path.map(q => (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y)));
                },
              };
            }).filter(e => e.path.length >= 2),
          ...svg.path.filter($ => $.parent.path[0] == $.original).
          filter($ => !$.parent.rect && ~$.parent.$.style.indexOf('shape-rendering:crispEdges')).
          map(e => e.d.match(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)(?:[ ,]\1[ ,]\2)?/g).map(s => {
            let n = s.split(/,| /);
            return {
              x: +n[0],
              y: +n[1],
            };
          })).map(p => {
            let from = p[0];
            let to = p[p.length - 1];
            return {
              from: [...nodes, start].sort((a, b) => a.distance(from) - b.distance(from)).shift(),
              to: [...nodes, start].sort((a, b) => a.distance(to) - b.distance(to)).shift(),
              path: p,
              //shape: 'curve',
              shape: 'line',
              label: '',
              distance(p) {
                return Math.min(...this.path.map(q => (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y)));
              },
            };
          }),
        ].map(l => {
          let label = svg.path.filter(p => ~p.parent.$.style.indexOf('text-rendering:optimizeLegibility')).
            map(p => Object.assign(p, {
              translate: {
                x: p.transform.translate[0] + p.width * 0.5,
                y: p.transform.translate[1] + p.height * 0.5,
              },
            })).
            sort((a, b) => {
              return l.distance(a.translate) - l.distance(b.translate);
            }).shift();
          if (label != null) {
            l.label = labels[label.d.slice(0,  64)];
            if (l.label == null) {
              l.label = '';
            }
          }
          return l;
        });

        const pathmatch = file.match(/^.*\/(\d_(H?L?))\/(\d_(P[12])(?:Before|After|Home))\/(\d\d[a-z]\d{4}[a-k])[^/]*\.svg$/i);
        if (!pathmatch) {
          return reject('file path is invalid format');
        }
        resolve({
          $: {
            path: file,
          },
          initial: {
            $: {
              x: start.x,
              y: start.y,
            },
          },
          states: {
            state: nodes.map(node => ({
              $: {
                x: node.x,
                y: node.y,
                label: node.label,
                //label: Math.random() * 10e8 | 0,
              },
            })),
          },
          transitions: {
            transition: edges.filter(edge => edges.find(e => e.from == edge.from && e.to == edge.to) == edge).map(edge => ({
              $: {
                from: edge.from.index || 0,
                to: edge.to.index || 0,
                //label: edge.from.index ? Math.random() * 10e8 | 0 : '',
                label: edge.from.index ? edge.label : '',
                shape: edge.shape,
              },
              point: edge.path.map(p => ({
                $: p,
              })),
            })),
          },
        });
      }

      svg.text.forEach(text => {
        let label = text.content;
        if (label == null) {
          return;
        }
        text.content = labels[label];
        if (text.content == null) {
          reject(`"${label}" is not supported`);
        }
      });

      let start = svg.circle.shift();
      start = {
        x: +start.cx + (start.transform.translate && start.transform.translate[0] || 0),
        y: +start.cy + (start.transform.translate && start.transform.translate[1] || 0),
        r: +start.r,
        distance(p) {
          return (this.x - p.x) * (this.x - p.x) + (this.y - p.y) * (this.y - p.y) - this.r * this.r;
        },
      };

      let nodes = svg.text.filter($ => $.content && $.x !== 'null' && $.x !== '').map(($, i) => {
        let rect = svg.rect.find(rect => $.parent.parent.rect.includes(rect.original));
        if (rect == null) {
          console.log(file, $);
          return {
            index: i + 1,
            text: $.content,
            distance() {
              return null;
            },
          };
        }
        return {
          index: i + 1,
          x: rect.transform.translate[0],
          y: rect.transform.translate[1],
          width: +rect.width,
          height: +rect.height,
          text: $.content,
          distance(p) {
            let x1 = this.x - p.x;
            let y1 = this.y - p.y;
            let x2 = this.x + this.width - p.x;
            let y2 = this.y + this.height - p.y;
            let x1s = x1 * x1;
            let y1s = y1 * y1;
            let x2s = x2 * x2;
            let y2s = y2 * y2;
            let d = [x1s + y1s, x1s + y2s, x2s + y1s, x2s + y2s];
            x1 < 0 && 0 < x2 && d.push(y1s, y2s);
            y1 < 0 && 0 < y2 && d.push(x1s, x2s);
            return Math.min(...d);
          },
        };
      });

      let edges = svg.text.filter($ => $.x === 'null' || $.x === '').map(text => {
        let arrow = svg.path.find($ => $.d == text.parent.parent.parent.parent.path[0].$.d);
        let p = arrow.d.match(/-?[0-9]+(\.[0-9]+)? -?[0-9]+(\.[0-9]+)?/g).map(s => {
          let [x, y] = s.split(/\s+/);
          return {
            x: +x + arrow.transform.translate[0],
            y: +y + arrow.transform.translate[1],
          };
        });
        //let shape = arrow.d.includes('L') ? 'line' : 'curve';
        let from = p[0];
        let to = p[p.length - 1];
        return {
          from: [...nodes, start].sort((a, b) => a.distance(from) - b.distance(from)).shift(),
          to: [...nodes, start].sort((a, b) => a.distance(to) - b.distance(to)).shift(),
          path: p,
          shape: 'line',
          text: text.content,
        };
      });

      const pathmatch = file.match(/^.*\/(\d_(H?L?))\/(\d_(P[12])(?:Before|After|Home))\/(\d\d[a-z]\d{4}[a-k])[^\/]*\.svg$/i);
      if (!pathmatch) {
        return reject('file path is invalid format');
      }
      resolve({
        $: {
          path: file,
        },
        initial: {
          $: {
            x: start.x,
            y: start.y,
          },
        },
        states: {
          state: nodes.map(node => ({
            $: {
              x: node.x,
              y: node.y,
              label: node.text,
            },
          })),
        },
        transitions: {
          transition: edges.filter(edge => edges.find(e => e.from == edge.from && e.to == edge.to) == edge).map(edge => ({
            $: {
              from: edge.from.index || 0,
              to: edge.to.index || 0,
              label: (edge.from.index > 0 && edge.text) || '',
              shape: edge.shape,
            },
            point: edge.path.map(p => ({
              $: p,
            })),
          })),
        },
      });
    });
  }).catch(err => ({
    $: {
      path: file,
    },
    error: util.inspect(err).replace(/[\x00-\x08\x0B-\x1F\x7F<>&'"]/g, c => `&#${c.charCodeAt(0)};`),
  }));
}

const target = path.resolve(process.argv[2] || '');
new Promise((resolve, reject) => fs.readdir(target, (err, files) => {
  if (err != null) {
    return reject(err);
  }
  resolve(files.map(f => path.join(target, f)));
})).then(files => Promise.all(files.map(file => new Promise((resolve, reject) => {
  const pathmatch = file.match(/^.*\/(\d_(H?L?))\/(\d_(P[12])(Before|After|Home))\/(\d\d[a-z]\d{4}[a-k])[^\/]*\.svg$/i);
  if (!pathmatch) {
    return reject(`file path is invalid format: "${file}"`);
  }
  return parse(file).then($ => {
    Object.assign($.$, {
      name: `${pathmatch[2].toUpperCase()}_${pathmatch[6].toLowerCase()}_${pathmatch[4].toUpperCase()}_${pathmatch[5].charAt(0)}`,
      directory: path.join(pathmatch[1].toUpperCase(), pathmatch[3]),
    });
    resolve($);
  }, reject);
})))).then(data => ({
  files: {
    file: data,
  },
  /*
  statistics: {
    label: [
      ...[].concat(...[].concat(...data.map($ => {
        return $.states;
      })).map($ => {
        return $ && $.state;
      })).map(state => {
        return state && state.$.label;
      }).filter((s, i, a) => s && a.indexOf(s) === i).map(state => ({
        $: { type: 'state' },
        _: state,
      })),
      ...[].concat(...[].concat(...data.map($ => {
        return $.transitions;
      })).map($ => {
        return $ && $.transition;
      })).map(transition => {
        return transition && transition.$.label;
      }).filter((s, i, a) => s && a.indexOf(s) === i).map(transition => ({
        $: { type: 'transition' },
        _: transition,
      })),
    ],
  },
  */
})).then(data => {
  const builder = new xml2js.Builder({ rootName: 'diagram' });
  return builder.buildObject(data);
}).then(console.log, console.error);
