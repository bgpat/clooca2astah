ASTAH_HOME=/Applications/astah professional/astah professional.app/Contents/Java
ASTAH_COM_JAR=${ASTAH_HOME}/astah-community.jar
ASTAH_UML_JAR=${ASTAH_HOME}/astah-uml.jar
ASTAH_PRO_JAR=${ASTAH_HOME}/astah-pro.jar
ASTAH_JAR=${ASTAH_COM_JAR}:${ASTAH_UML_JAR}:${ASTAH_PRO_JAR}
API_JAR=${ASTAH_HOME}/astah-api.jar
CLASSPATH="./build":"${ASTAH_JAR}":"${API_JAR}"

.PHONY: all
all: build/Builder.class

.PHONY: run
run: build/Builder.class
	@java -classpath ${CLASSPATH} Builder

.PHONY: clean
clean:
	rm -rf ./build/*

build:
	@mkdir build

build/Builder.class: build $(wildcard *.java)
	javac -d ./build -classpath ${CLASSPATH} *.java
