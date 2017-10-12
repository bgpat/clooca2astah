import java.awt.geom.Point2D;
import java.util.ArrayList;
import java.util.List;
import javax.xml.bind.annotation.XmlType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlElementWrapper;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlValue;
import javax.xml.bind.Unmarshaller;

@XmlRootElement
public class Diagram {
    public static interface IStateNode {
        public Point2D getPoint();
        public String getLabel();
    }

    public static class File {
        @XmlAttribute
        private String path;

        @XmlAttribute
        private String name;

        @XmlAttribute
        private String directory;

        @XmlElement
        private Error error;

        @XmlElement
        private Initial initial;

        @XmlElementWrapper
        @XmlElement(name = "state")
        private List<State> states;

        @XmlElementWrapper
        @XmlElement(name = "transition")
        private List<Transition> transitions;

        public String getPath() {
            return path;
        }

        public String getName() {
            return name;
        }

        public String getDirectory() {
            return directory;
        }

        public String getError() {
            if (error == null) {
                return "";
            }
            return error.toString();
        }

        public Initial getInitial() {
            return initial;
        }

        public List<State> getStates() {
            return states;
        }

        public List<Transition> getTransitions() {
            return transitions;
        }

        @Override
        public String toString() {
            if (error != null) {
                return String.format("error: %s", error);
            }
            return name;
        }
    }

    public static class Error {
        @XmlValue
        private String text;

        @Override
        public String toString() {
            return text;
        }
    }

    public static class Initial implements IStateNode {
        @XmlAttribute
        private Double x;

        @XmlAttribute
        private Double y;

        public Point2D getPoint() {
            return new Point2D.Double(x, y);
        }

        public String getLabel() {
            return "";
        }

        @Override
        public String toString() {
            return String.format("%s(%g, %g)", getLabel(), x, y);
        }
    }

    public static class State implements IStateNode {
        @XmlAttribute
        private Double x;

        @XmlAttribute
        private Double y;

        @XmlAttribute
        private String label;

        public Point2D getPoint() {
            return new Point2D.Double(x, y);
        }

        public String getLabel() {
            return label;
        }

        @Override
        public String toString() {
            return String.format("%s(%g, %g)", getLabel(), x, y);
        }
    }

    public static class Transition {
        private File parent;

        @XmlAttribute(name = "from")
        private int fromIndex;

        @XmlAttribute(name = "to")
        private int toIndex;

        @XmlAttribute
        private String label;

        @XmlElement(name = "point")
        private List<Point> points;

        @XmlAttribute
        private String shape;

        private void afterUnmarshal(Unmarshaller u, Object p) {
            parent = (File)p;
        }

        public IStateNode from() {
            if (fromIndex > 0) {
                return parent.states.get(fromIndex - 1);
            }
            return parent.initial;
        }

        public IStateNode to() {
            if (toIndex > 0) {
                return parent.states.get(toIndex - 1);
            }
            return parent.initial;
        }

        public int getFromIndex() {
            return fromIndex;
        }

        public int getToIndex() {
            return toIndex;
        }

        public String getLabel() {
            return label;
        }

        public List<Point2D> getPoints() {
            List<Point2D> result = new ArrayList<>();
            for (Point p: points) {
                result.add(p.getPoint());
            }
            return result;
        }

        public String getShape() {
            return shape;
        }

        @Override
        public String toString() {
            return String.format("%s(%s->%s)", getLabel(), from().getLabel(), to().getLabel());
        }
    }

    public static class Point {
        @XmlAttribute
        private double x;

        @XmlAttribute
        private double y;

        public Point2D getPoint() {
            return new Point2D.Double(x, y);
        }
    }

    @XmlElementWrapper
    @XmlElement(name = "file")
    private List<File> files;

    public List<File> getFiles() {
        return files;
    }

    @Override
    public String toString() {
        String result = "";
        for (File f: files) {
            result +=String.format("%s\n", f);
        }
        return result;
    }
}
