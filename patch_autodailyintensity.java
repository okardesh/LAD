import javassist.*;
import java.io.*;
import java.nio.file.*;

/**
 * Makes AsyncImpl.autoDailyIntensity resilient:
 *   1. Null-guard: drop rows whose start/end/dataDate is null (or start > end)
 *      before the per-second loop runs -> no more "date must not be null" NPE.
 *   2. Best-effort: any exception inside autoDailyIntensity is swallowed so the
 *      job upload (already committed at this point) still returns success.
 *
 * Usage:  java -cp javassist.jar:. patch_autodailyintensity <extracted-classes-dir> [lib-dir]
 * Writes the patched AsyncImpl.class back into <extracted-classes-dir>.
 */
public class patch_autodailyintensity {
    public static void main(String[] args) throws Exception {
        String classesDir = args[0];
        String libDir = args.length > 1 ? args[1] : null;

        ClassPool pool = new ClassPool(true); // includes system path
        pool.appendClassPath(classesDir);
        if (libDir != null) {
            File[] jars = new File(libDir).listFiles(new FilenameFilter() {
                public boolean accept(File d, String n) { return n.endsWith(".jar"); }
            });
            if (jars != null) for (File j : jars) pool.appendClassPath(j.getAbsolutePath());
        }

        CtClass cc = pool.get("com.linktera.rpadashboard.component.impl.AsyncImpl");
        CtMethod m = cc.getDeclaredMethod("autoDailyIntensity");

        m.insertBefore(
            "{" +
            "  java.util.List _clean = new java.util.ArrayList();" +
            "  if ($1 != null) {" +
            "    for (int _i = 0; _i < $1.size(); _i++) {" +
            "      Object _o = $1.get(_i);" +
            "      try {" +
            "        com.linktera.rpadashboard.dto.RpadJobsDto _d =" +
            "          (com.linktera.rpadashboard.dto.RpadJobsDto) this.mapper.convertValue(_o, com.linktera.rpadashboard.dto.RpadJobsDto.class);" +
            "        if (_d != null && _d.getStartTime() != null && _d.getEndTime() != null" +
            "            && _d.getDataDate() != null" +
            "            && _d.getStartTime().getTime() <= _d.getEndTime().getTime()) {" +
            "          _clean.add(_o);" +
            "        }" +
            "      } catch (java.lang.Throwable _t) { }" +
            "    }" +
            "  }" +
            "  int _dropped = ($1 == null ? 0 : $1.size()) - _clean.size();" +
            "  if (_dropped > 0) System.out.println(\"[patch] autoDailyIntensity: skipped \" + _dropped + \" job row(s) with missing/invalid dates\");" +
            "  $1 = _clean;" +
            "}"
        );

        m.addCatch(
            "{" +
            "  System.out.println(\"[patch] autoDailyIntensity failed, continuing: \" + $e);" +
            "  return;" +
            "}",
            pool.get("java.lang.Throwable")
        );

        byte[] out = cc.toBytecode();
        Path dest = Paths.get(classesDir,
            "com", "linktera", "rpadashboard", "component", "impl", "AsyncImpl.class");
        Files.write(dest, out);
        System.out.println("Patched " + dest + " (" + out.length + " bytes)");
    }
}
