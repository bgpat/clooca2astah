import java.awt.geom.Point2D;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.xml.bind.JAXBContext;
import javax.xml.bind.JAXBException;
import javax.xml.bind.Unmarshaller;

import com.change_vision.jude.api.inf.AstahAPI;
import com.change_vision.jude.api.inf.editor.BasicModelEditor;
import com.change_vision.jude.api.inf.editor.ModelEditorFactory;
import com.change_vision.jude.api.inf.editor.StateMachineDiagramEditor;
import com.change_vision.jude.api.inf.editor.TransactionManager;
import com.change_vision.jude.api.inf.exception.InvalidEditingException;
import com.change_vision.jude.api.inf.exception.LicenseNotFoundException;
import com.change_vision.jude.api.inf.exception.ProjectLockedException;
import com.change_vision.jude.api.inf.exception.ProjectNotFoundException;
import com.change_vision.jude.api.inf.model.IModel;
import com.change_vision.jude.api.inf.model.IPackage;
import com.change_vision.jude.api.inf.model.IStateMachineDiagram;
import com.change_vision.jude.api.inf.presentation.ILinkPresentation;
import com.change_vision.jude.api.inf.presentation.INodePresentation;
import com.change_vision.jude.api.inf.project.ProjectAccessor;

public class Builder {
    public static void main(String[] args) {
        Diagram d = load();
        //System.out.println(d);

        try {
            ProjectAccessor pa = AstahAPI.getAstahAPI().getProjectAccessor();
            for (Diagram.File f: d.getFiles()) {
                try {
                    String err = f.getError();
                    if (err != "") {
                        System.out.println(String.format("%s: \033[31merror\033[00m\n%s", f.getName(), err));
                        continue;
                    }
                    pa.create(String.format("%s/%s.asta", f.getDirectory(), f.getName()));
                    IModel prj = pa.getProject();
                    TransactionManager.beginTransaction();

                    StateMachineDiagramEditor smde = pa.getDiagramEditorFactory().getStateMachineDiagramEditor();
                    IStateMachineDiagram smd = smde.createStatemachineDiagram(prj, f.getName());

                    List<INodePresentation> nodes = new ArrayList<>();
                    nodes.add(smde.createInitialPseudostate(null, f.getInitial().getPoint()));
                    for (Diagram.State s: f.getStates()) {
                        INodePresentation node = smde.createState(s.getLabel(), null, s.getPoint());
                        node.setProperty("action_visibility", "false");
                        nodes.add(node);
                    }

                    for (Diagram.Transition t: f.getTransitions()) {
                        ILinkPresentation tr = smde.createTransition(nodes.get(t.getFromIndex()), nodes.get(t.getToIndex()));
                        tr.setLabel(t.getLabel());
                        tr.setProperty("line.shape", t.getShape());
                        List<Point2D> points = new ArrayList<>(Arrays.asList(tr.getPoints()));
                        points.addAll(1, t.getPoints());
                        tr.setPoints((Point2D[])points.toArray(new Point2D[0]));
                    }

                    TransactionManager.endTransaction();
                    pa.save();
                    System.out.println(String.format("%s: \033[32msaved\033[00m", f.getName()));
                } catch (LicenseNotFoundException e) {
                    e.printStackTrace();
                } catch (ProjectNotFoundException e) {
                    e.printStackTrace();
                } catch (ProjectLockedException e) {
                    e.printStackTrace();
                } catch (InvalidEditingException e) {
                    System.out.println(String.format("%s: \033[31merror\033[00m", f.getName()));
                    TransactionManager.abortTransaction();
                    System.err.println(e.getMessage());
                    e.printStackTrace();
                } catch (Throwable e) {
                    e.printStackTrace();
                }
            }
            pa.close();
        } catch (Throwable e) {
            e.printStackTrace();
        }
    }

    private static Diagram load() {
        Diagram diagram = null;
        try {
            JAXBContext jaxbContext = JAXBContext.newInstance(Diagram.class);
            Unmarshaller unmarshaller = jaxbContext.createUnmarshaller();
            diagram = (Diagram)unmarshaller.unmarshal(System.in);
        } catch (JAXBException e) {
            e.printStackTrace();
        }
        return diagram;
    }
}
