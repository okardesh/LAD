import java.sql.*;
public class Query {
    public static void main(String[] args) throws Exception {
        Connection conn = DriverManager.getConnection("jdbc:h2:file:./smartaggregator-db", "sa", "");
        Statement s = conn.createStatement();
        
        ResultSet rs1 = s.executeQuery("SELECT * FROM app_operations LIMIT 1");
        ResultSetMetaData rsmd1 = rs1.getMetaData();
        for (int i=1; i<=rsmd1.getColumnCount(); i++) System.out.print(rsmd1.getColumnName(i) + " ");
        System.out.println();
        
        ResultSet rs2 = s.executeQuery("SELECT * FROM app_tables LIMIT 1");
        ResultSetMetaData rsmd2 = rs2.getMetaData();
        for (int i=1; i<=rsmd2.getColumnCount(); i++) System.out.print(rsmd2.getColumnName(i) + " ");
        System.out.println();
        
        conn.close();
    }
}
