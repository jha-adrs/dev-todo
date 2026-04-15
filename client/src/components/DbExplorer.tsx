import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

interface TableInfo {
  name: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: string;
    notNull: boolean;
    primaryKey: boolean;
  }>;
}

interface TableData {
  table: string;
  totalRows: number;
  page: number;
  limit: number;
  totalPages: number;
  rows: Record<string, unknown>[];
}

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

interface DbExplorerProps {
  onBack: () => void;
}

export default function DbExplorer({ onBack }: DbExplorerProps) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [page, setPage] = useState(1);
  const [queryMode, setQueryMode] = useState(false);
  const [sql, setSql] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<TableInfo[]>("/api/explorer/tables").then(setTables).catch(console.error);
  }, []);

  const loadTable = useCallback(async (name: string, p = 1) => {
    setLoading(true);
    try {
      const data = await api.get<TableData>(`/api/explorer/tables/${name}?page=${p}&limit=50`);
      setTableData(data);
      setSelectedTable(name);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  async function runQuery() {
    if (!sql.trim()) return;
    setQueryError("");
    setLoading(true);
    try {
      const result = await api.post<QueryResult>("/api/explorer/query", { sql });
      setQueryResult(result);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : "Query failed");
      setQueryResult(null);
    } finally {
      setLoading(false);
    }
  }

  function renderValue(val: unknown): string {
    if (val === null) return "NULL";
    if (typeof val === "string" && val.length > 100) return val.slice(0, 100) + "...";
    return String(val);
  }

  const currentTableInfo = tables.find((t) => t.name === selectedTable);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        padding: "20px 24px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={onBack}
              style={{
                padding: "6px 12px",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                color: "var(--text-secondary)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              ← Todos
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  background: "#f59e0b",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "12px",
                }}
              >
                DB
              </div>
              <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                Database Explorer
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => { setQueryMode(false); setQueryResult(null); }}
              style={{
                padding: "6px 14px",
                backgroundColor: !queryMode ? "var(--color-primary-dim)" : "var(--bg-card)",
                border: `1px solid ${!queryMode ? "var(--color-primary-border)" : "var(--border)"}`,
                borderRadius: "6px",
                color: !queryMode ? "var(--color-primary-light)" : "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Tables
            </button>
            <button
              onClick={() => setQueryMode(true)}
              style={{
                padding: "6px 14px",
                backgroundColor: queryMode ? "var(--color-primary-dim)" : "var(--bg-card)",
                border: `1px solid ${queryMode ? "var(--color-primary-border)" : "var(--border)"}`,
                borderRadius: "6px",
                color: queryMode ? "var(--color-primary-light)" : "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              SQL Query
            </button>
          </div>
        </div>

        {queryMode ? (
          /* SQL Query Mode */
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                placeholder="SELECT * FROM todos LIMIT 10"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runQuery();
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  resize: "vertical",
                  minHeight: "80px",
                  outline: "none",
                }}
              />
              <button
                onClick={runQuery}
                disabled={loading}
                style={{
                  padding: "12px 20px",
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: loading ? "wait" : "pointer",
                  alignSelf: "flex-end",
                }}
              >
                {loading ? "..." : "Run"}
              </button>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", marginBottom: "12px" }}>
              read-only // Cmd+Enter to run
            </div>
            {queryError && (
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "var(--color-danger-dim)",
                  border: "1px solid var(--color-danger)",
                  borderRadius: "8px",
                  color: "var(--color-danger)",
                  fontSize: "13px",
                  fontFamily: "var(--font-mono)",
                  marginBottom: "16px",
                }}
              >
                {queryError}
              </div>
            )}
            {queryResult && (
              <DataTable
                columns={queryResult.columns}
                rows={queryResult.rows}
                renderValue={renderValue}
              />
            )}
          </div>
        ) : (
          /* Table Browser Mode */
          <div style={{ display: "flex", gap: "16px" }}>
            {/* Table list */}
            <div style={{ width: "220px", flexShrink: 0 }}>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                  padding: "0 4px",
                }}
              >
                Tables ({tables.length})
              </div>
              <div
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "4px",
                }}
              >
                {tables.map((t) => (
                  <div
                    key={t.name}
                    onClick={() => loadTable(t.name)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor:
                        selectedTable === t.name ? "var(--color-primary-dim)" : "transparent",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "background-color 0.1s",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: selectedTable === t.name ? 600 : 400,
                        color:
                          selectedTable === t.name
                            ? "var(--color-primary-light)"
                            : "var(--text-primary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {t.name}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        backgroundColor: "var(--bg)",
                        padding: "1px 6px",
                        borderRadius: "10px",
                      }}
                    >
                      {t.rowCount}
                    </span>
                  </div>
                ))}
              </div>

              {/* Column info */}
              {currentTableInfo && (
                <div style={{ marginTop: "16px" }}>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "8px",
                      padding: "0 4px",
                    }}
                  >
                    Columns
                  </div>
                  <div
                    style={{
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "8px",
                    }}
                  >
                    {currentTableInfo.columns.map((c) => (
                      <div
                        key={c.name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "4px 6px",
                          fontSize: "11px",
                        }}
                      >
                        <span
                          style={{
                            color: c.primaryKey ? "var(--color-amber)" : "var(--text-primary)",
                            fontFamily: "var(--font-mono)",
                            fontWeight: c.primaryKey ? 600 : 400,
                          }}
                        >
                          {c.primaryKey ? "🔑 " : ""}{c.name}
                        </span>
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "10px",
                          }}
                        >
                          {c.type.toLowerCase()}
                          {c.notNull ? " !" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Data view */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {!selectedTable ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                  }}
                >
                  select a table to browse
                </div>
              ) : loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                  }}
                >
                  loading...
                </div>
              ) : tableData ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {tableData.totalRows} rows // page {tableData.page}/{tableData.totalPages}
                    </span>
                    {tableData.totalPages > 1 && (
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          onClick={() => loadTable(selectedTable, page - 1)}
                          disabled={page <= 1}
                          style={{
                            padding: "4px 10px",
                            backgroundColor: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            borderRadius: "4px",
                            color: page <= 1 ? "var(--text-dim)" : "var(--text-secondary)",
                            fontSize: "11px",
                            cursor: page <= 1 ? "default" : "pointer",
                          }}
                        >
                          ←
                        </button>
                        <button
                          onClick={() => loadTable(selectedTable, page + 1)}
                          disabled={page >= tableData.totalPages}
                          style={{
                            padding: "4px 10px",
                            backgroundColor: "var(--bg-card)",
                            border: "1px solid var(--border)",
                            borderRadius: "4px",
                            color:
                              page >= tableData.totalPages
                                ? "var(--text-dim)"
                                : "var(--text-secondary)",
                            fontSize: "11px",
                            cursor: page >= tableData.totalPages ? "default" : "pointer",
                          }}
                        >
                          →
                        </button>
                      </div>
                    )}
                  </div>
                  <DataTable
                    columns={
                      currentTableInfo
                        ? currentTableInfo.columns.map((c) => c.name)
                        : Object.keys(tableData.rows[0] || {})
                    }
                    rows={tableData.rows}
                    renderValue={renderValue}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DataTable({
  columns,
  rows,
  renderValue,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
  renderValue: (val: unknown) => string;
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        overflow: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                  position: "sticky",
                  top: 0,
                  backgroundColor: "var(--bg-card)",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                no rows
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                style={{
                  borderBottom:
                    i < rows.length - 1 ? "1px solid var(--border-light)" : "none",
                }}
              >
                {columns.map((col) => {
                  const val = row[col];
                  const isNull = val === null;
                  return (
                    <td
                      key={col}
                      style={{
                        padding: "8px 14px",
                        color: isNull ? "var(--text-dim)" : "var(--text-primary)",
                        fontStyle: isNull ? "italic" : "normal",
                        whiteSpace: "nowrap",
                        maxWidth: "300px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={String(val)}
                    >
                      {renderValue(val)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
