import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { t } from "@/lib/i18n";
import { ArrowUpRight, Banknote, Bell, CalendarDays, ChevronRight, CircleDollarSign, FileCheck2, Landmark, Plus, Search, ShieldCheck, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";

const money = (value: number) => new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 }).format(value);
const productLabel: Record<string, string> = { business: "Business", individual: "Individual", group: "Group", salary: "Salary" };

export default function Home() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const summary = trpc.reports.summary.useQuery(undefined, { retry: false });
  const applications = trpc.loans.list.useQuery(undefined, { retry: false });
  const visibleApplications = useMemo(() => (applications.data ?? []).filter(({ loan }) => filter === "all" || loan.status === filter), [applications.data, filter]);

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-[#17231f]">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-7 lg:px-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#cfe2d9] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#2e6a53]">
              <span className="h-2 w-2 rounded-full bg-[#2e9b6d] shadow-[0_0_0_4px_rgba(46,155,109,.12)]" /> Live workspace
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Good morning, {user?.name?.split(" ")[0] || "there"}.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#6d7d75]">Keep every application, decision, and repayment moving with a clear view of the portfolio.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="hidden border-[#dbe7e1] bg-white text-[#456257] sm:flex"><CalendarDays className="mr-2 h-4 w-4" /> Sep 2026</Button>
            <Button className="bg-[#173e32] text-white shadow-[0_10px_22px_rgba(23,62,50,.16)] hover:bg-[#245845]"><Plus className="mr-2 h-4 w-4" /> New application</Button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={t("activeLoans")} value={summary.data ? String(summary.data.activeLoans).padStart(2, "0") : "—"} detail="Across your branches" icon={WalletCards} accent="green" />
          <MetricCard label={t("portfolio")} value={summary.data ? money(summary.data.portfolio) : "—"} detail="Approved repayment value" icon={Landmark} accent="gold" />
          <MetricCard label={t("collected")} value={summary.data ? money(summary.data.collected) : "—"} detail="Recorded repayments" icon={CircleDollarSign} accent="blue" />
          <MetricCard label={t("arrears")} value={summary.data ? money(summary.data.arrears) : "—"} detail="Needs collections attention" icon={ShieldCheck} accent="rose" />
        </section>

        <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.85fr)]">
          <Card className="overflow-hidden border-[#e0e9e4] bg-white shadow-[0_14px_42px_rgba(34,67,53,.06)]">
            <CardHeader className="border-b border-[#edf2ee] px-5 pb-4 pt-5 sm:px-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div><CardTitle className="font-display text-xl">{t("recentApplications")}</CardTitle><p className="mt-1 text-sm text-[#829088]">Monitor the latest movement across your portfolio.</p></div>
                <div className="relative w-full sm:w-48"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94a59c]" /><Input placeholder="Search applications" className="h-9 border-[#e3ece7] bg-[#f8faf9] pl-9 text-xs" /></div>
              </div>
              <Tabs value={filter} onValueChange={setFilter} className="mt-5"><TabsList className="h-9 bg-[#f1f6f3] p-1"><TabsTrigger value="all" className="text-xs">All</TabsTrigger><TabsTrigger value="submitted" className="text-xs">Needs review</TabsTrigger><TabsTrigger value="active" className="text-xs">Active</TabsTrigger></TabsList></Tabs>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[#fbfcfb] text-[10px] uppercase tracking-[0.16em] text-[#91a097]"><tr><th className="px-7 py-3 font-semibold">Applicant</th><th className="px-4 py-3 font-semibold">Product</th><th className="px-4 py-3 font-semibold">Principal</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-7 py-3" /></tr></thead><tbody className="divide-y divide-[#edf2ee]">{visibleApplications.length ? visibleApplications.slice(0, 6).map(({ loan, client }) => <tr key={loan.id} className="group transition-colors hover:bg-[#fbfdfc]"><td className="px-7 py-4"><div className="font-medium text-[#23352c]">{client?.fullName || `Application #${loan.id}`}</div><div className="mt-1 text-xs text-[#91a097]">#{String(loan.id).padStart(5, "0")} · {loan.termMonths} months</div></td><td className="px-4 py-4 text-[#61736a]">{productLabel[loan.product]}</td><td className="px-4 py-4 font-medium text-[#23352c]">{money(Number(loan.principal))}</td><td className="px-4 py-4"><StatusBadge status={loan.status} /></td><td className="px-7 py-4 text-right"><ChevronRight className="ml-auto h-4 w-4 text-[#b6c5bd] transition-transform group-hover:translate-x-1" /></td></tr>) : <tr><td colSpan={5} className="px-7 py-16 text-center text-sm text-[#91a097]">{t("noData")}</td></tr>}</tbody></table></div>
              <div className="flex items-center justify-between border-t border-[#edf2ee] px-7 py-4"><span className="text-xs text-[#91a097]">Showing {visibleApplications.length} recent records</span><Button variant="ghost" className="h-8 text-xs text-[#2e6a53] hover:bg-[#eef6f1]">{t("viewAll")} <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" /></Button></div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="relative overflow-hidden border-0 bg-[#173e32] text-white shadow-[0_18px_42px_rgba(23,62,50,.18)]"><div className="absolute -right-10 -top-12 h-40 w-40 rounded-full border-[20px] border-white/5" /><div className="absolute -bottom-16 -right-2 h-48 w-48 rounded-full border-[20px] border-[#d7b65b]/10" /><CardHeader className="relative px-6 pb-2 pt-6"><div className="flex items-center justify-between"><div className="rounded-xl bg-white/10 p-2.5"><FileCheck2 className="h-5 w-5 text-[#e6cb7c]" /></div><Badge className="border-0 bg-[#d7b65b]/15 text-[#f4dda0]">This month</Badge></div><CardTitle className="mt-5 font-display text-xl font-medium">A healthier portfolio starts with visibility.</CardTitle></CardHeader><CardContent className="relative px-6 pb-6"><p className="text-sm leading-6 text-[#c3d6cc]">Review pending decisions early and keep repayments tied to the same trusted schedule.</p><Button className="mt-5 bg-[#f1d487] text-[#173e32] hover:bg-[#f7e3a9]">Open review queue <ArrowUpRight className="ml-2 h-4 w-4" /></Button></CardContent></Card>
            <Card className="border-[#e0e9e4] bg-white shadow-[0_14px_42px_rgba(34,67,53,.06)]"><CardHeader className="flex flex-row items-center justify-between px-6 pb-2 pt-5"><div><CardTitle className="font-display text-lg">Quick actions</CardTitle><p className="mt-1 text-xs text-[#829088]">Common operations for your role</p></div><Bell className="h-4 w-4 text-[#9bacA2]" /></CardHeader><CardContent className="grid gap-2 px-6 pb-6 pt-3"><QuickAction icon={Banknote} title="Record a repayment" detail="Finance & collections" /><QuickAction icon={FileCheck2} title="Review applications" detail="3 waiting for action" /><QuickAction icon={ShieldCheck} title="Open compliance report" detail="September reporting" /></CardContent></Card>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail, icon: Icon, accent }: { label: string; value: string; detail: string; icon: typeof WalletCards; accent: string }) { const accents: Record<string, string> = { green: "bg-[#e9f5ee] text-[#2e8b62]", gold: "bg-[#fbf4df] text-[#b38b29]", blue: "bg-[#e9f1f8] text-[#4b7ca4]", rose: "bg-[#faeeee] text-[#ba6b68]" }; return <Card className="border-[#e0e9e4] bg-white shadow-[0_14px_42px_rgba(34,67,53,.05)]"><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-[#829088]">{label}</p><div className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#20372b]">{value}</div></div><div className={`rounded-xl p-2.5 ${accents[accent]}`}><Icon className="h-5 w-5" /></div></div><p className="mt-4 text-xs text-[#9aa9a1]">{detail}</p></CardContent></Card> }
function StatusBadge({ status }: { status: string }) { const labels: Record<string, string> = { submitted: "Needs review", under_review: "In review", approved: "Approved", rejected: "Rejected", active: "Active", disbursed: "Disbursed", completed: "Completed" }; return <Badge variant="outline" className={`rounded-full border-0 px-2.5 py-1 text-[10px] font-semibold ${status === "active" ? "bg-[#eaf6ef] text-[#2e8b62]" : status === "approved" ? "bg-[#eef1fb] text-[#6874ae]" : status === "rejected" ? "bg-[#faeeee] text-[#ba6b68]" : "bg-[#fbf4df] text-[#ad8526]"}`}>{labels[status] || status}</Badge> }
function QuickAction({ icon: Icon, title, detail }: { icon: typeof Banknote; title: string; detail: string }) { return <Button variant="ghost" className="h-auto justify-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#f5f8f6]"><div className="rounded-lg bg-[#eef6f1] p-2 text-[#2e7a5b]"><Icon className="h-4 w-4" /></div><div><div className="text-sm font-medium text-[#31453b]">{title}</div><div className="mt-0.5 text-[11px] font-normal text-[#91a097]">{detail}</div></div><ChevronRight className="ml-auto h-4 w-4 text-[#c2cec7]" /></Button> }
