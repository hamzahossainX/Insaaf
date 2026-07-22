import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { api, currency } from "../api/client";
import { useAuth } from "../lib/auth";

export default function Payroll() {
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const { data: employees, refetch: refetchEmployees } = useQuery({
    queryKey: ["employees", user?.wing_id],
    queryFn: () => api.get("/payroll/employees", { params: { wing_id: user?.wing_id ?? undefined } }).then((r) => r.data),
  });
  const { data: wings } = useQuery({ queryKey: ["wings"], queryFn: () => api.get("/wings").then((r) => r.data) });
  const { data: accounts } = useQuery({ queryKey: ["accounts"], queryFn: () => api.get("/accounts").then((r) => r.data) });
  const [selected, setSelected] = useState<string | null>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ["employee", selected],
    queryFn: () => api.get(`/payroll/employees/${selected}`).then((r) => r.data),
    enabled: !!selected,
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [advanceAmt, setAdvanceAmt] = useState<number | "">("");
  const [advanceAccount, setAdvanceAccount] = useState("");
  const [advanceNote, setAdvanceNote] = useState("");
  const [advanceError, setAdvanceError] = useState("");
  const [incType, setIncType] = useState<"ONE_TIME_BONUS" | "PERMANENT_RAISE">("ONE_TIME_BONUS");
  const [incAmount, setIncAmount] = useState<number | "">("");
  const [incNote, setIncNote] = useState("");
  const [incError, setIncError] = useState("");
  const [payrollAccount, setPayrollAccount] = useState("");
  const [payrollNote, setPayrollNote] = useState("");
  const [payrollError, setPayrollError] = useState("");
  const [preview, setPreview] = useState<any>(null);

  const { data: loanSummary } = useQuery({
    queryKey: ["employee-loans", selected],
    queryFn: () => api.get(`/employee-loans/employee/${selected}`).then((r) => r.data),
    enabled: !!selected,
  });
  const [loanGiveAmt, setLoanGiveAmt] = useState<number | "">("");
  const [loanGiveAccount, setLoanGiveAccount] = useState("");
  const [loanGiveNote, setLoanGiveNote] = useState("");
  const [loanGiveError, setLoanGiveError] = useState("");
  const [loanReceiveAmt, setLoanReceiveAmt] = useState<number | "">("");
  const [loanReceiveAccount, setLoanReceiveAccount] = useState("");
  const [loanReceiveNote, setLoanReceiveNote] = useState("");
  const [loanReceiveError, setLoanReceiveError] = useState("");

  const addAdvance = useMutation({
    mutationFn: () => api.post("/payroll/advances", { employee_id: selected, amount: advanceAmt, paid_from_account_id: advanceAccount, month_applied_to: currentMonth, note: advanceNote || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employee", selected] }); qc.invalidateQueries({ queryKey: ["accounts"] }); setAdvanceAmt(""); setAdvanceNote(""); setAdvanceError(""); },
    onError: (e: any) => setAdvanceError(e?.response?.data?.error ?? "Failed to add advance"),
  });
  const addIncrement = useMutation({
    mutationFn: () => api.post("/payroll/increments", { employee_id: selected, type: incType, amount_or_new_base: incAmount, effective_month: currentMonth, note: incNote || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employee", selected] }); setIncAmount(""); setIncNote(""); setIncError(""); },
    onError: (e: any) => setIncError(e?.response?.data?.error ?? "Failed to add increment"),
  });
  const loadPreview = useMutation({
    mutationFn: () => api.get("/payroll/preview", { params: { employee_id: selected, month: currentMonth } }).then((r) => r.data),
    onSuccess: (data) => { setPreview(data); setPayrollError(""); },
    onError: (e: any) => setPayrollError(e?.response?.data?.error ?? "Failed to load preview"),
  });
  const runPayroll = useMutation({
    mutationFn: () => api.post("/payroll/run", { employee_id: selected, month: currentMonth, paid_from_account_id: payrollAccount, note: payrollNote || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employee", selected] }); qc.invalidateQueries({ queryKey: ["accounts"] }); setPreview(null); setPayrollNote(""); setPayrollError(""); },
    onError: (e: any) => setPayrollError(e?.response?.data?.error ?? "Failed to run payroll"),
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/payroll/employees/${id}`),
    onSuccess: () => { setSelected(null); refetchEmployees(); },
    onError: (e: any) => alert(e?.response?.data?.error ?? "Failed to remove employee"),
  });

  const giveLoan = useMutation({
    mutationFn: () => api.post("/employee-loans", { employee_id: selected, amount: loanGiveAmt, paid_from_account_id: loanGiveAccount, note: loanGiveNote || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-loans", selected] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setLoanGiveAmt(""); setLoanGiveNote(""); setLoanGiveError("");
    },
    onError: (e: any) => setLoanGiveError(e?.response?.data?.error ?? "Failed to give loan/advance"),
  });
  const receiveRepayment = useMutation({
    mutationFn: () => api.post("/employee-loans/repayments", { employee_id: selected, amount: loanReceiveAmt, received_into_account_id: loanReceiveAccount, note: loanReceiveNote || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-loans", selected] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      setLoanReceiveAmt(""); setLoanReceiveNote(""); setLoanReceiveError("");
    },
    onError: (e: any) => setLoanReceiveError(e?.response?.data?.error ?? "Failed to record repayment"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-slate-100">Employees & Payroll</h1>
        {isAdmin && <button className="btn-primary" onClick={() => setShowAddEmployee(!showAddEmployee)}>+ Add employee</button>}
      </div>

      {showAddEmployee && (
        <AddEmployeeForm
          wings={wings ?? []}
          defaultWingId={user?.wing_id ?? undefined}
          onDone={() => { setShowAddEmployee(false); refetchEmployees(); }}
        />
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-0 overflow-hidden lg:col-span-1">
          <div className="px-4 py-2 font-medium border-b border-gray-200 dark:border-slate-700">Employees</div>
          {(employees ?? []).length === 0 && <div className="px-4 py-3 text-sm text-gray-400 dark:text-slate-500">No employees yet. Use "+ Add employee" above.</div>}
          {(employees ?? []).map((e: any) => (
            <div key={e.id} className={`flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700/40 ${selected === e.id ? "bg-brand-50 dark:bg-brand-500/15" : ""}`}>
              <button className="text-left flex-1 min-w-0" onClick={() => { setSelected(e.id); setPreview(null); }}>
                <div className="font-medium truncate">{e.name}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{e.role} · {currency(e.base_salary)}/mo</div>
              </button>
              {isAdmin && (
                <button
                  className="icon-btn-danger shrink-0"
                  title="Remove employee"
                  onClick={() => {
                    if (confirm(`Remove ${e.name} from active employees? Their history is kept.`)) deactivate.mutate(e.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!profile && <div className="card text-sm text-gray-400 dark:text-slate-500">Select an employee to view details.</div>}
          {profile && (
            <>
              <div className="card">
                <div className="font-medium">{profile.employee.name}</div>
                <div className="text-sm text-gray-500 dark:text-slate-400">{profile.employee.role} · Base salary {currency(profile.employee.base_salary)}</div>
              </div>

              <div className="card space-y-3">
                <div className="flex flex-wrap gap-2 justify-between items-center">
                  <div className="font-medium">Loans & Advances</div>
                  <div className="text-sm">
                    Outstanding: <span className={loanSummary && loanSummary.outstanding_balance > 0 ? "text-red-600 dark:text-red-400 font-semibold" : "font-semibold"}>
                      {currency(loanSummary?.outstanding_balance ?? 0)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Separate from payroll advances above — this is cash given to the employee that they pay back directly (in full or in parts), whenever it suits them.
                </p>

                {isAdmin && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2 border border-gray-200 dark:border-slate-700 rounded-lg p-3">
                      <div className="text-sm font-medium">Give loan / advance</div>
                      {loanGiveError && <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded px-2 py-1">{loanGiveError}</div>}
                      <input className="input" type="number" placeholder="Amount" value={loanGiveAmt} onChange={(e) => setLoanGiveAmt(e.target.value === "" ? "" : Number(e.target.value))} />
                      <select className="input" value={loanGiveAccount} onChange={(e) => setLoanGiveAccount(e.target.value)}>
                        <option value="">Paid from...</option>
                        {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <input className="input" placeholder="Note (optional)" value={loanGiveNote} onChange={(e) => setLoanGiveNote(e.target.value)} />
                      <button className="btn-primary w-full" disabled={!loanGiveAmt || !loanGiveAccount || giveLoan.isPending} onClick={() => giveLoan.mutate()}>
                        {giveLoan.isPending ? "Recording..." : "Give money"}
                      </button>
                    </div>
                    <div className="space-y-2 border border-gray-200 dark:border-slate-700 rounded-lg p-3">
                      <div className="text-sm font-medium">Receive repayment</div>
                      {loanReceiveError && <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded px-2 py-1">{loanReceiveError}</div>}
                      <input className="input" type="number" placeholder="Amount" value={loanReceiveAmt} onChange={(e) => setLoanReceiveAmt(e.target.value === "" ? "" : Number(e.target.value))} />
                      <select className="input" value={loanReceiveAccount} onChange={(e) => setLoanReceiveAccount(e.target.value)}>
                        <option value="">Received into...</option>
                        {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <input className="input" placeholder="Note (optional)" value={loanReceiveNote} onChange={(e) => setLoanReceiveNote(e.target.value)} />
                      <button
                        className="btn-primary w-full"
                        disabled={!loanReceiveAmt || !loanReceiveAccount || receiveRepayment.isPending || !loanSummary?.outstanding_balance}
                        onClick={() => receiveRepayment.mutate()}
                      >
                        {receiveRepayment.isPending ? "Recording..." : "Receive money"}
                      </button>
                    </div>
                  </div>
                )}

                {loanSummary && (loanSummary.loans.length > 0 || loanSummary.repayments.length > 0) && (
                  <div className="table-scroll">
                  <table className="table-base">
                    <thead><tr><th>Date</th><th>Type</th><th>Amount</th></tr></thead>
                    <tbody>
                      {[
                        ...loanSummary.loans.map((l: any) => ({ id: l.id, date: l.date, type: "Given", amount: Number(l.amount) })),
                        ...loanSummary.repayments.map((r: any) => ({ id: r.id, date: r.date, type: "Repaid", amount: Number(r.amount) })),
                      ]
                        .sort((a, b) => (a.date < b.date ? 1 : -1))
                        .map((row) => (
                          <tr key={row.id}>
                            <td>{new Date(row.date).toLocaleDateString()}</td>
                            <td className={row.type === "Given" ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}>{row.type}</td>
                            <td>{currency(row.amount)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="card space-y-2">
                    <div className="font-medium text-sm">Add advance</div>
                    {advanceError && <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded px-2 py-1">{advanceError}</div>}
                    <input className="input" type="number" placeholder="Amount" value={advanceAmt} onChange={(e) => setAdvanceAmt(e.target.value === "" ? "" : Number(e.target.value))} />
                    <select className="input" value={advanceAccount} onChange={(e) => setAdvanceAccount(e.target.value)}>
                      <option value="">Paid from...</option>
                      {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <input className="input" placeholder="Note (optional)" value={advanceNote} onChange={(e) => setAdvanceNote(e.target.value)} />
                    <button className="btn-primary w-full" disabled={!advanceAmt || !advanceAccount || addAdvance.isPending} onClick={() => addAdvance.mutate()}>
                      {addAdvance.isPending ? "Adding..." : "Add advance"}
                    </button>
                  </div>
                  <div className="card space-y-2">
                    <div className="font-medium text-sm">Add increment</div>
                    {incError && <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded px-2 py-1">{incError}</div>}
                    <select className="input" value={incType} onChange={(e) => setIncType(e.target.value as any)}>
                      <option value="ONE_TIME_BONUS">One-time bonus</option>
                      <option value="PERMANENT_RAISE">Permanent raise (new base)</option>
                    </select>
                    <input className="input" type="number" placeholder="Amount / new base" value={incAmount} onChange={(e) => setIncAmount(e.target.value === "" ? "" : Number(e.target.value))} />
                    <input className="input" placeholder="Note (optional)" value={incNote} onChange={(e) => setIncNote(e.target.value)} />
                    <button className="btn-primary w-full" disabled={!incAmount || addIncrement.isPending} onClick={() => addIncrement.mutate()}>
                      {addIncrement.isPending ? "Adding..." : "Add increment"}
                    </button>
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="card space-y-3">
                  <div className="font-medium">Run month-end payroll — {currentMonth}</div>
                  {payrollError && <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">{payrollError}</div>}
                  <button className="btn-secondary" onClick={() => loadPreview.mutate()} disabled={loadPreview.isPending}>
                    {loadPreview.isPending ? "Loading..." : "Preview net payable"}
                  </button>
                  {preview && (
                    <div className="text-sm space-y-1 bg-gray-50 dark:bg-slate-900/40 rounded-lg p-3">
                      <div className="flex justify-between"><span>Base salary</span><span>{currency(preview.base_salary)}</span></div>
                      <div className="flex justify-between"><span>+ Increments</span><span>{currency(preview.increment_amount)}</span></div>
                      <div className="flex justify-between"><span>− Advances</span><span>{currency(preview.total_advances)}</span></div>
                      <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-slate-700 pt-1"><span>Net payable</span><span>{currency(preview.net_paid)}</span></div>
                      <select className="input mt-2" value={payrollAccount} onChange={(e) => setPayrollAccount(e.target.value)}>
                        <option value="">Pay from account...</option>
                        {(accounts ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <input className="input mt-2" placeholder="Note (optional)" value={payrollNote} onChange={(e) => setPayrollNote(e.target.value)} />
                      <button className="btn-primary w-full mt-2" disabled={!payrollAccount || runPayroll.isPending} onClick={() => runPayroll.mutate()}>
                        {runPayroll.isPending ? "Paying..." : "Confirm & pay"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="card">
                <div className="font-medium mb-2">Advance history</div>
                {profile.advances.length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">None yet.</div>}
                <div className="table-scroll">
                <table className="table-base">
                  <thead><tr><th>Date</th><th>Month applied</th><th>Amount</th></tr></thead>
                  <tbody>
                    {profile.advances.map((a: any) => (
                      <tr key={a.id}><td>{new Date(a.date).toLocaleDateString()}</td><td>{a.month_applied_to}</td><td>{currency(a.amount)}</td></tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              <div className="card">
                <div className="font-medium mb-2">Increment history</div>
                {profile.increments.length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">None yet.</div>}
                <div className="table-scroll">
                <table className="table-base">
                  <thead><tr><th>Month</th><th>Type</th><th>Amount / new base</th></tr></thead>
                  <tbody>
                    {profile.increments.map((i: any) => (
                      <tr key={i.id}><td>{i.effective_month}</td><td>{i.type.replaceAll("_", " ")}</td><td>{currency(i.amount_or_new_base)}</td></tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              <div className="card">
                <div className="font-medium mb-2">Payroll history</div>
                {profile.payroll.length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">No payroll runs yet.</div>}
                <div className="table-scroll">
                <table className="table-base">
                  <thead><tr><th>Month</th><th>Base</th><th>Increment</th><th>Advances</th><th>Net paid</th></tr></thead>
                  <tbody>
                    {profile.payroll.map((p: any) => (
                      <tr key={p.id}>
                        <td>{p.month}</td><td>{currency(p.base_salary)}</td><td>{currency(p.increment_amount)}</td>
                        <td>{currency(p.total_advances)}</td><td>{currency(p.net_paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              <div className="card">
                <div className="font-medium mb-2">Delivery history</div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Every sale this employee was assigned to deliver — when, what, and where.</p>
                {profile.deliveries.length === 0 && <div className="text-sm text-gray-400 dark:text-slate-500">No deliveries recorded yet.</div>}
                {profile.deliveries.length > 0 && (
                  <div className="table-scroll">
                  <table className="table-base">
                    <thead><tr><th>Date</th><th>Customer</th><th>Delivered to</th><th>Items</th></tr></thead>
                    <tbody>
                      {profile.deliveries.map((d: any) => (
                        <tr key={d.id}>
                          <td className="whitespace-nowrap">{new Date(d.date).toLocaleDateString()}</td>
                          <td>{d.customer?.name ?? "—"}</td>
                          <td className="text-gray-500 dark:text-slate-400">{d.customer?.address || "—"}</td>
                          <td className="text-gray-600 dark:text-slate-300">
                            {d.line_items.map((li: any) => `${li.quantity}× ${li.product.category} (${li.product.size_variant})`).join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AddEmployeeForm({ wings, defaultWingId, onDone }: { wings: any[]; defaultWingId?: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [wingId, setWingId] = useState(defaultWingId ?? "");
  const [baseSalary, setBaseSalary] = useState<number | "">("");
  const [joinDate, setJoinDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: () => api.post("/payroll/employees", { name, role, wing_id: wingId, base_salary: baseSalary, join_date: joinDate, note: note || undefined }),
    onSuccess: onDone,
    onError: (e: any) => setError(e?.response?.data?.error ?? "Failed to add employee"),
  });

  return (
    <div className="card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
      {error && <div className="sm:col-span-2 lg:col-span-5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
      <div><label className="label">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><label className="label">Role</label><input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Delivery Driver" /></div>
      <div>
        <label className="label">Wing</label>
        <select className="input" value={wingId} onChange={(e) => setWingId(e.target.value)}>
          <option value="">Select wing...</option>
          {wings.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      <div><label className="label">Base salary</label><input className="input" type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value === "" ? "" : Number(e.target.value))} /></div>
      <div><label className="label">Join date</label><input className="input" type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} /></div>
      <div className="sm:col-span-2 lg:col-span-5"><label className="label">Note (optional)</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <button className="btn-primary sm:col-span-2 lg:col-span-5" disabled={!name || !role || !wingId || !baseSalary || create.isPending} onClick={() => create.mutate()}>
        {create.isPending ? "Saving..." : "Save employee"}
      </button>
    </div>
  );
}
