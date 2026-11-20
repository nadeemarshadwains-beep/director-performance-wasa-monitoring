import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity, ArrowDownToLine, BarChart3, Bell, Building2, CalendarDays, Check,
  ChevronDown, CircleDollarSign, ClipboardCheck, FileBarChart2, FileSpreadsheet,
  Droplets, LayoutDashboard, LogOut, Menu, Plus, Search, Settings2, ShieldCheck,
  Target, Users, Waves, X, MapPinned, RefreshCw, LockKeyhole, AlertCircle,
  Paperclip,
} from "lucide-react";
import { createWorkbook } from "./lib/workbook";
import { isPasswordSetupRedirect, isSupabaseConfigured, supabase } from "./lib/supabase";
import type {
  Assignment, Director, FieldVisit, MonthlyReport, PerformanceTarget, Profile, Wasa,
} from "./types";

type Page = "overview" | "monthly" | "visits" | "targets" | "team" | "exports";
type AppData = {
  directors: Director[];
  wasas: Wasa[];
  assignments: Assignment[];
  reports: MonthlyReport[];
  visits: FieldVisit[];
  targets: PerformanceTarget[];
};

const OverviewCharts = lazy(() => import("./OverviewCharts"));

const emptyData: AppData = { directors: [], wasas: [], assignments: [], reports: [], visits: [], targets: [] };
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const punjabWasaNames = [
  "Lahore WASA", "Faisalabad WASA", "Rawalpindi WASA", "Multan WASA", "Gujranwala WASA",
  "Sialkot WASA", "Bahawalpur WASA", "Sargodha WASA", "Sheikhupura WASA", "Rahim Yar Khan WASA",
  "Jhang WASA", "Dera Ghazi Khan WASA", "Gujrat WASA", "Sahiwal WASA", "Okara WASA",
  "Kasur WASA", "Pakpattan WASA", "Vehari WASA", "Khanewal WASA", "Muzaffargarh WASA",
  "Rajanpur WASA", "Bahawalnagar WASA", "Layyah WASA", "Bhakkar WASA", "Mianwali WASA",
  "Jhelum WASA", "Chakwal WASA", "Attock WASA", "Nankana Sahib WASA", "Hafizabad WASA",
  "Narowal WASA", "Chiniot WASA", "Toba Tek Singh WASA", "Mandi Bahauddin WASA",
  "Khushab WASA", "Lodhran WASA", "Taunsa WASA", "Murree WASA", "Talagang WASA",
  "Wazirabad WASA", "Kot Addu WASA",
];

const demoDirectors: Director[] = Array.from({ length: 7 }, (_, index) => ({
  id: `director-${index + 1}`,
  full_name: `Director ${index + 1}`,
  email: `director${index + 1}@punjab.gov.pk`,
  auth_user_id: null,
  is_active: true,
}));

const demoWasas: Wasa[] = punjabWasaNames.map((name, index) => ({
  id: `wasa-${index + 1}`,
  name,
  code: `PUN-${String(index + 1).padStart(2, "0")}`,
  is_active: true,
}));

const demoAssignments: Assignment[] = demoWasas.map((wasa, index) => ({
  id: `assignment-${index + 1}`,
  director_id: `director-${Math.floor(index / 6) + 1}`,
  wasa_id: wasa.id,
  valid_from: "2026-01-01",
  valid_to: null,
}));

const demoReports: MonthlyReport[] = demoWasas.map((wasa, index) => {
  const directorIndex = Math.floor(index / 6);
  const demand = 9_500_000 + ((index * 137_000) % 8_000_000);
  const recoveryRate = 74 + ((index * 3) % 19);
  const collection = Math.round(demand * recoveryRate / 100);
  const openingArrears = 20_000_000 + ((index * 1_250_000) % 18_000_000);
  const additionalArrears = 800_000 + ((index * 91_000) % 1_400_000);
  const arrearsRecovered = 1_100_000 + ((index * 73_000) % 2_200_000);
  const adjustments = 100_000 + ((index * 29_000) % 400_000);
  const closingArrears = openingArrears + additionalArrears - arrearsRecovered - adjustments;
  const openingSurveys = 5_000 + index * 137;
  const newSurveys = 55 + ((index * 7) % 115);
  const removedSurveys = 8 + (index % 19);
  const openingWater = 35_000 + index * 920;
  const newWater = 45 + ((index * 5) % 85);
  const removedWater = 3 + (index % 9);
  const openingSewer = 18_000 + index * 510;
  const newSewer = 20 + ((index * 3) % 55);
  const removedSewer = 2 + (index % 6);
  const status: MonthlyReport["status"] = index % 9 === 0 ? "submitted" : index % 17 === 0 ? "returned" : "approved";
  return {
    id: `report-${index + 1}`,
    wasa_id: wasa.id,
    director_id: `director-${directorIndex + 1}`,
    report_year: 2026,
    report_month: 11,
    status,
    submitted_by: "demo",
    submitted_at: `2026-11-${String(5 + (index % 13)).padStart(2, "0")}T10:00:00Z`,
    reviewed_by: status === "approved" ? "demo" : null,
    reviewed_at: status === "approved" ? "2026-11-12T10:00:00Z" : null,
    review_comment: status === "returned" ? "Please reconcile the arrears balance and resubmit." : null,
    monthly_demand: demand,
    monthly_collection: collection,
    outstanding_current_demand: demand - collection,
    recovery_percentage: recoveryRate,
    opening_arrears: openingArrears,
    additional_arrears: additionalArrears,
    arrears_recovered: arrearsRecovered,
    approved_adjustments: adjustments,
    closing_arrears: closingArrears,
    opening_surveys: openingSurveys,
    new_surveys: newSurveys,
    corrected_surveys: 30 + (index % 70),
    removed_surveys: removedSurveys,
    closing_surveys: openingSurveys + newSurveys - removedSurveys,
    opening_water_connections: openingWater,
    new_water_connections: newWater,
    removed_water_connections: removedWater,
    closing_water_connections: openingWater + newWater - removedWater,
    water_connections_net_change: newWater - removedWater,
    opening_sewer_connections: openingSewer,
    new_sewer_connections: newSewer,
    removed_sewer_connections: removedSewer,
    closing_sewer_connections: openingSewer + newSewer - removedSewer,
    sewer_connections_net_change: newSewer - removedSewer,
    created_at: "2026-11-08T10:00:00Z",
  };
});

const demoVisits: FieldVisit[] = demoWasas.slice(0, 18).map((wasa, index) => {
  const directorIndex = Math.floor(index / 3);
  return {
    id: `visit-${index + 1}`,
    director_id: `director-${directorIndex + 1}`,
    wasa_id: wasa.id,
    visit_date: `2026-11-${String(18 - (index % 14)).padStart(2, "0")}`,
    location: `${wasa.name.replace(" WASA", "")} operational division`,
    purpose: index % 2 === 0 ? "Revenue recovery review" : "Field and service delivery inspection",
    activities_performed: "Reviewed recovery teams, pending consumer surveys and connection records.",
    issues_identified: "Aging arrears and incomplete field records require follow-up.",
    instructions_given: "Update division records and submit a corrective action report.",
    progress_achieved: "Assigned actions and responsible officers confirmed.",
    pending_actions: "Submit follow-up progress within seven days.",
    responsible_officer: "Area Deputy Director",
    expected_completion_date: "2026-11-28",
    remarks: null,
    attachment_path: null,
    created_at: "2026-11-18T09:00:00Z",
  };
});

const demoData: AppData = {
  directors: demoDirectors,
  wasas: demoWasas,
  assignments: demoAssignments,
  reports: demoReports,
  visits: demoVisits,
  targets: demoDirectors.slice(0, 7).flatMap((director, index) => [
    { id: `target-revenue-${index + 1}`, metric: "revenue_collection", period_type: "monthly" as const, period_year: 2026, period_month: 11, director_id: director.id, wasa_id: null, target_value: 36_000_000 + index * 3_000_000 },
    { id: `target-arrears-${index + 1}`, metric: "arrears_recovery", period_type: "monthly" as const, period_year: 2026, period_month: 11, director_id: director.id, wasa_id: null, target_value: 7_000_000 + index * 500_000 },
  ]),
};
const metrics = [
  ["revenue_collection", "Revenue collection"],
  ["arrears_recovery", "Arrears recovery"],
  ["field_visits", "Field visits"],
  ["surveys", "New consumer surveys"],
  ["water_connections", "New water connections"],
  ["sewer_connections", "New sewer connections"],
] as const;
function money(value: number) {
  return `Rs. ${Math.round(Number(value) || 0).toLocaleString("en-PK")}`;
}

function numberValue(value: unknown) {
  return Number(value) || 0;
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "The requested operation failed. Please try again.";
}

async function downloadExcel(reports: MonthlyReport[], wasaName: (id: string) => string, directorName: (id: string) => string) {
  const rows = reports.map((report) => ({
    WASA: wasaName(report.wasa_id),
    Director: directorName(report.director_id),
    Year: report.report_year,
    Month: monthNames[report.report_month - 1],
    Status: report.status,
    "Demand (Rs.)": report.monthly_demand,
    "Collection (Rs.)": report.monthly_collection,
    "Current Outstanding (Rs.)": report.outstanding_current_demand,
    "Recovery (%)": report.recovery_percentage ?? "",
    "Opening Arrears (Rs.)": report.opening_arrears,
    "Arrears Added (Rs.)": report.additional_arrears,
    "Arrears Recovered (Rs.)": report.arrears_recovered,
    "Adjustments (Rs.)": report.approved_adjustments,
    "Closing Arrears (Rs.)": report.closing_arrears,
    "New Surveys": report.new_surveys,
    "Surveys Corrected": report.corrected_surveys,
    "Surveys Removed": report.removed_surveys,
    "New Water Connections": report.new_water_connections,
    "Water Connections Removed": report.removed_water_connections,
    "New Sewer Connections": report.new_sewer_connections,
    "Sewer Connections Removed": report.removed_sewer_connections,
  }));
  const headers = [
    "WASA", "Director", "Year", "Month", "Status", "Demand (Rs.)", "Collection (Rs.)",
    "Current Outstanding (Rs.)", "Recovery (%)", "Opening Arrears (Rs.)", "Arrears Added (Rs.)",
    "Arrears Recovered (Rs.)", "Adjustments (Rs.)", "Closing Arrears (Rs.)", "New Surveys",
    "Surveys Corrected", "Surveys Removed", "New Water Connections", "Water Connections Removed",
    "New Sewer Connections", "Sewer Connections Removed",
  ];
  const archive = createWorkbook(headers, rows);
  const file = new Blob([archive], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = `wasa-monthly-reports-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

async function downloadPdf(reports: MonthlyReport[], wasaName: (id: string) => string, directorName: (id: string) => string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape" });
  pdf.setFontSize(15);
  pdf.text("Director Performance & WASA Monitoring", 14, 16);
  pdf.setFontSize(9);
  pdf.text(`Monthly report export | Generated ${new Date().toLocaleDateString()}`, 14, 23);
  const headers = ["WASA", "Director", "Period", "Status", "Demand (Rs.)", "Collected (Rs.)", "Recovery", "Arrears rec. (Rs.)", "Closing arrears (Rs.)"];
  const widths = [39, 39, 22, 23, 30, 30, 22, 32, 34];
  let y = 33;
  let page = 1;
  const drawHeader = () => {
    let x = 14;
    pdf.setFillColor(16, 42, 67);
    pdf.rect(14, y - 5, 269, 9, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    headers.forEach((header, index) => {
      pdf.text(header, x + 1, y);
      x += widths[index];
    });
    y += 9;
    pdf.setTextColor(31, 52, 70);
  };
  drawHeader();
  for (const report of reports) {
    if (y > 190) {
      pdf.addPage();
      page += 1;
      y = 18;
      drawHeader();
    }
    const values = [
      wasaName(report.wasa_id),
      directorName(report.director_id),
      `${monthNames[report.report_month - 1].slice(0, 3)} ${report.report_year}`,
      report.status,
      Math.round(report.monthly_demand).toLocaleString("en-PK"),
      Math.round(report.monthly_collection).toLocaleString("en-PK"),
      report.recovery_percentage == null ? "—" : `${report.recovery_percentage}%`,
      Math.round(report.arrears_recovered).toLocaleString("en-PK"),
      Math.round(report.closing_arrears).toLocaleString("en-PK"),
    ];
    let x = 14;
    values.forEach((value, index) => {
      pdf.text(String(value).slice(0, 23), x + 1, y);
      x += widths[index];
    });
    y += 7;
  }
  pdf.setFontSize(8);
  pdf.text(`Page ${page}`, 270, 202);
  pdf.save(`wasa-monthly-reports-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function App() {
  const [sessionUser, setSessionUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [passwordSetup, setPasswordSetup] = useState(isPasswordSetupRedirect);
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState<Page>("overview");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [directorFilter, setDirectorFilter] = useState("all");
  const [wasaFilter, setWasaFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [reportEditor, setReportEditor] = useState<MonthlyReport | "new" | null>(null);
  const [visitEditor, setVisitEditor] = useState(false);
  const [targetEditor, setTargetEditor] = useState(false);
  const [managerEditor, setManagerEditor] = useState(false);
  const [wasaEditor, setWasaEditor] = useState(false);

  const loadData = useCallback(async () => {
    if (!supabase || !sessionUser) return;
    setDataLoading(true);
    setError("");
    const [directors, wasas, assignments, reports, visits, targets] = await Promise.all([
      supabase.from("directors").select("id,full_name,email,auth_user_id,is_active").order("full_name"),
      supabase.from("wasas").select("id,name,code,is_active").order("name"),
      supabase.from("director_wasa_assignments").select("id,director_id,wasa_id,valid_from,valid_to"),
      supabase.from("monthly_reports").select("*").order("report_year", { ascending: false }).order("report_month", { ascending: false }).limit(5000),
      supabase.from("field_visits").select("*").order("visit_date", { ascending: false }).limit(5000),
      supabase.from("performance_targets").select("*").order("period_year", { ascending: false }),
    ]);
    const failed = [directors, wasas, assignments, reports, visits, targets].find((result) => result.error);
    if (failed?.error) {
      setError(failed.error.message);
      setDataLoading(false);
      return;
    }
    setData({
      directors: (directors.data ?? []) as Director[],
      wasas: (wasas.data ?? []) as Wasa[],
      assignments: (assignments.data ?? []) as Assignment[],
      reports: (reports.data ?? []) as MonthlyReport[],
      visits: (visits.data ?? []) as FieldVisit[],
      targets: (targets.data ?? []) as PerformanceTarget[],
    });
    setDataLoading(false);
  }, [sessionUser]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;
    let live = true;
    const resolveSession = async (user: { id: string; email?: string } | null) => {
      if (!live) return;
      setSessionUser(user);
      setProfile(null);
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: userProfile, error: profileError } = await client
        .from("profiles")
        .select("id,full_name,role,director_id")
        .eq("id", user.id)
        .single();
      if (!live) return;
      if (profileError) {
        setError(`Your account profile could not be loaded: ${profileError.message}`);
      } else {
        setProfile(userProfile as Profile);
        setError("");
      }
      setLoading(false);
    };
    void client.auth.getSession().then(({ data: result, error: authError }) => {
      if (authError) setError(authError.message);
      void resolveSession(result.session?.user ?? null);
    });
    const { data: listener } = client.auth.onAuthStateChange((event, currentSession) => {
      if (event === "PASSWORD_RECOVERY") setPasswordSetup(true);
      void resolveSession(currentSession?.user ?? null);
    });
    return () => {
      live = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (profile && sessionUser) void loadData();
  }, [profile, sessionUser, loadData]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const isAdmin = profile?.role === "admin";
  const directorName = useCallback((id: string) => data.directors.find((item) => item.id === id)?.full_name ?? "Unknown Director", [data.directors]);
  const wasaName = useCallback((id: string) => data.wasas.find((item) => item.id === id)?.name ?? "Unknown WASA", [data.wasas]);

  const assignments = useMemo(() => data.assignments.filter((item) => {
    const today = new Date().toISOString().slice(0, 10);
    return item.valid_from <= today && (!item.valid_to || item.valid_to >= today);
  }), [data.assignments]);

  const allCurrentReports = useMemo(() => data.reports.filter((report) =>
    report.report_year === year
      && report.report_month === month
      && (directorFilter === "all" || report.director_id === directorFilter)
      && (wasaFilter === "all" || report.wasa_id === wasaFilter),
  ), [data.reports, year, month, directorFilter, wasaFilter]);
  const currentReports = useMemo(
    () => allCurrentReports.filter((report) => report.status === "submitted" || report.status === "approved"),
    [allCurrentReports],
  );

  const currentVisits = useMemo(() => data.visits.filter((visit) => {
    const date = new Date(`${visit.visit_date}T00:00:00`);
    return date.getFullYear() === year && date.getMonth() + 1 === month
      && (directorFilter === "all" || visit.director_id === directorFilter)
      && (wasaFilter === "all" || visit.wasa_id === wasaFilter);
  }), [data.visits, year, month, directorFilter, wasaFilter]);

  const trendReports = useMemo(() => data.reports.filter((report) =>
    report.report_year === year
      && (report.status === "submitted" || report.status === "approved")
      && (directorFilter === "all" || report.director_id === directorFilter)
      && (wasaFilter === "all" || report.wasa_id === wasaFilter),
  ), [data.reports, year, directorFilter, wasaFilter]);

  const monthlyTrend = useMemo(() => monthNames.map((name, index) => {
    const monthReports = trendReports.filter((item) => item.report_month === index + 1);
    const demand = monthReports.reduce((sum, item) => sum + numberValue(item.monthly_demand), 0);
    const collected = monthReports.reduce((sum, item) => sum + numberValue(item.monthly_collection), 0);
    return {
      month: name.slice(0, 3),
      demand,
      collected,
      arrearsRecovered: monthReports.reduce((sum, item) => sum + numberValue(item.arrears_recovered), 0),
      surveys: monthReports.reduce((sum, item) => sum + numberValue(item.new_surveys), 0),
      water: monthReports.reduce((sum, item) => sum + numberValue(item.new_water_connections), 0),
      sewer: monthReports.reduce((sum, item) => sum + numberValue(item.new_sewer_connections), 0),
    };
  }), [trendReports]);

  const visitsTrend = useMemo(() => monthNames.map((name, index) => ({
    month: name.slice(0, 3),
    visits: data.visits.filter((visit) => {
      const date = new Date(`${visit.visit_date}T00:00:00`);
      return date.getFullYear() === year && date.getMonth() === index
        && (directorFilter === "all" || visit.director_id === directorFilter)
        && (wasaFilter === "all" || visit.wasa_id === wasaFilter);
    }).length,
  })), [data.visits, year, directorFilter, wasaFilter]);

  const directorPerformance = useMemo(() => data.directors
    .filter((director) => director.is_active)
    .filter((director) => directorFilter === "all" || director.id === directorFilter)
    .map((director) => {
      const rows = currentReports.filter((item) => item.director_id === director.id);
      const demand = rows.reduce((sum, item) => sum + numberValue(item.monthly_demand), 0);
      const collection = rows.reduce((sum, item) => sum + numberValue(item.monthly_collection), 0);
      return {
        name: director.full_name.split(" ").slice(-1)[0],
        fullName: director.full_name,
        collection,
        recovery: demand ? Math.round((collection / demand) * 100) : 0,
        visits: currentVisits.filter((item) => item.director_id === director.id).length,
      };
    }).sort((a, b) => b.recovery - a.recovery), [data.directors, currentReports, currentVisits, directorFilter]);

  const wasaPerformance = useMemo(() => data.wasas
    .filter((wasa) => wasa.is_active && (wasaFilter === "all" || wasa.id === wasaFilter))
    .map((wasa) => {
      const rows = currentReports.filter((item) => item.wasa_id === wasa.id);
      return {
        name: wasa.name,
        demand: rows.reduce((sum, item) => sum + numberValue(item.monthly_demand), 0),
        collection: rows.reduce((sum, item) => sum + numberValue(item.monthly_collection), 0),
      };
    })
    .filter((item) => item.demand || item.collection)
    .sort((a, b) => b.collection - a.collection)
    .slice(0, 8), [data.wasas, currentReports, wasaFilter]);

  const targetComparison = useMemo(() => data.targets
    .filter((target) => target.period_year === year
      && (target.period_type === "annual" || target.period_month === month)
      && (!target.director_id || directorFilter === "all" || target.director_id === directorFilter)
      && (!target.wasa_id || wasaFilter === "all" || target.wasa_id === wasaFilter))
    .map((target) => {
      const rows = trendReports.filter((report) =>
        (target.period_type === "annual" ? report.report_month <= month : report.report_month === month)
        && (target.wasa_id ? report.wasa_id === target.wasa_id : report.director_id === target.director_id),
      );
      const visits = data.visits.filter((visit) => {
        const date = new Date(`${visit.visit_date}T00:00:00`);
        return date.getFullYear() === year
          && (target.period_type === "annual" ? date.getMonth() < month : date.getMonth() + 1 === month)
          && (target.wasa_id ? visit.wasa_id === target.wasa_id : visit.director_id === target.director_id)
          && (directorFilter === "all" || visit.director_id === directorFilter)
          && (wasaFilter === "all" || visit.wasa_id === wasaFilter);
      });
      let actual = 0;
      switch (target.metric) {
        case "revenue_collection": actual = rows.reduce((sum, item) => sum + numberValue(item.monthly_collection), 0); break;
        case "arrears_recovery": actual = rows.reduce((sum, item) => sum + numberValue(item.arrears_recovered), 0); break;
        case "field_visits": actual = visits.length; break;
        case "surveys": actual = rows.reduce((sum, item) => sum + numberValue(item.new_surveys), 0); break;
        case "water_connections": actual = rows.reduce((sum, item) => sum + numberValue(item.new_water_connections), 0); break;
        case "sewer_connections": actual = rows.reduce((sum, item) => sum + numberValue(item.new_sewer_connections), 0); break;
      }
      const entityName = target.director_id ? directorName(target.director_id) : wasaName(target.wasa_id!);
      return {
        label: `${entityName.split(" ").slice(-1)[0]} · ${target.period_type} · ${metrics.find(([key]) => key === target.metric)?.[1] ?? target.metric}`,
        target: 100,
        actual: target.target_value ? Math.round(actual / Number(target.target_value) * 100) : 0,
      };
    })
    .slice(0, 8), [data.targets, data.visits, trendReports, year, month, directorFilter, wasaFilter, directorName, wasaName]);

  const totals = useMemo(() => ({
    demand: currentReports.reduce((sum, item) => sum + numberValue(item.monthly_demand), 0),
    collection: currentReports.reduce((sum, item) => sum + numberValue(item.monthly_collection), 0),
    arrears: currentReports.reduce((sum, item) => sum + numberValue(item.closing_arrears), 0),
    arrearsRecovered: currentReports.reduce((sum, item) => sum + numberValue(item.arrears_recovered), 0),
    surveys: currentReports.reduce((sum, item) => sum + numberValue(item.new_surveys), 0),
    water: currentReports.reduce((sum, item) => sum + numberValue(item.new_water_connections), 0),
    sewer: currentReports.reduce((sum, item) => sum + numberValue(item.new_sewer_connections), 0),
    recovery: currentReports.reduce((sum, item) => sum + numberValue(item.monthly_demand), 0)
      ? currentReports.reduce((sum, item) => sum + numberValue(item.monthly_collection), 0)
        / currentReports.reduce((sum, item) => sum + numberValue(item.monthly_demand), 0) * 100
      : null,
  }), [currentReports]);

  const availableWasas = useMemo(() => {
    if (isAdmin) return data.wasas.filter((wasa) => wasa.is_active);
    const allowed = new Set(assignments.filter((item) => item.director_id === profile?.director_id).map((item) => item.wasa_id));
    return data.wasas.filter((wasa) => allowed.has(wasa.id) && wasa.is_active);
  }, [data.wasas, assignments, isAdmin, profile?.director_id]);

  const pendingCount = useMemo(() => {
    const directors = data.directors.filter((item) => item.is_active && (directorFilter === "all" || item.id === directorFilter));
    const selectedWasas = data.wasas.filter((wasa) => wasa.is_active && (wasaFilter === "all" || wasa.id === wasaFilter));
    let expected = 0;
    for (const assignment of assignments) {
      if (directors.some((item) => item.id === assignment.director_id)
        && selectedWasas.some((item) => item.id === assignment.wasa_id)) expected += 1;
    }
    const completed = new Set(allCurrentReports
      .filter((item) => item.status === "submitted" || item.status === "approved" || item.status === "returned")
      .map((item) => item.wasa_id)).size;
    return Math.max(expected - completed, 0) + allCurrentReports.filter((item) => item.status === "returned").length;
  }, [data.directors, data.wasas, assignments, allCurrentReports, directorFilter, wasaFilter]);

  const availableDirectors = isAdmin
    ? data.directors
    : data.directors.filter((item) => item.id === profile?.director_id);

  const runAction = async (action: () => Promise<{ error: { message: string } | null }>, success: string) => {
    setError("");
    const result = await action();
    if (result.error) {
      setError(result.error.message);
      return false;
    }
    setNotice(success);
    await loadData();
    return true;
  };

  const handleLogin = async (email: string, password: string) => {
    if (!supabase) return;
    setError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) setError(loginError.message);
  };

  const handleReset = async (email: string) => {
    if (!supabase) return;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    });
    if (resetError) setError(resetError.message);
    else setNotice("Password reset instructions have been sent if this account exists.");
  };

  const handleSetPassword = async (password: string) => {
    if (!supabase) return false;
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    setPasswordSetup(false);
    setNotice("Password saved. Your account is ready to use.");
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  };

  const signOut = async () => {
    if (!supabase) {
      setSessionUser(null);
      setProfile(null);
      setPreviewMode(false);
      setData(emptyData);
      setPage("overview");
      return;
    }
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    else {
      setData(emptyData);
      setPage("overview");
    }
  };

  const saveReport = async (values: Record<string, string>, action: "draft" | "submit") => {
    if (!supabase || !profile?.director_id || !sessionUser) return false;
    const fields = [
      "monthly_demand", "monthly_collection", "opening_arrears", "additional_arrears",
      "arrears_recovered", "approved_adjustments", "opening_surveys", "new_surveys",
      "corrected_surveys", "removed_surveys", "opening_water_connections",
      "new_water_connections", "removed_water_connections", "opening_sewer_connections",
      "new_sewer_connections", "removed_sewer_connections",
    ];
    const numericFields = Object.fromEntries(fields.map((field) => [field, numberValue(values[field])]));
    const closingArrears = numberValue(values.opening_arrears) + numberValue(values.additional_arrears)
      - numberValue(values.arrears_recovered) - numberValue(values.approved_adjustments);
    const closingSurveys = numberValue(values.opening_surveys) + numberValue(values.new_surveys) - numberValue(values.removed_surveys);
    const closingWater = numberValue(values.opening_water_connections) + numberValue(values.new_water_connections) - numberValue(values.removed_water_connections);
    const closingSewer = numberValue(values.opening_sewer_connections) + numberValue(values.new_sewer_connections) - numberValue(values.removed_sewer_connections);
    if ([closingArrears, closingSurveys, closingWater, closingSewer].some((value) => value < 0)) {
      setError("The closing balance cannot be negative. Check opening balances and removals/recoveries.");
      return false;
    }
    const existing = reportEditor !== "new" ? reportEditor : null;
    const row = {
      ...numericFields,
      wasa_id: existing?.wasa_id ?? values.wasa_id,
      director_id: profile.director_id,
      report_year: existing?.report_year ?? Number(values.report_year),
      report_month: existing?.report_month ?? Number(values.report_month),
      status: action === "submit" ? "submitted" : "draft",
      submitted_by: sessionUser.id,
    };
    const result = existing
      ? await supabase.from("monthly_reports").update({
          ...numericFields,
          status: row.status,
          submitted_by: sessionUser.id,
        }).eq("id", existing.id)
      : await supabase.from("monthly_reports").insert(row);
    if (result.error) {
      setError(result.error.message);
      return false;
    }
    setReportEditor(null);
    setNotice(action === "submit" ? "Monthly report submitted for review." : "Draft saved.");
    await loadData();
    return true;
  };

  const saveVisit = async (values: Record<string, string>, attachment: File | null) => {
    if (!supabase || !profile?.director_id || !sessionUser) return;
    let attachmentPath: string | null = null;
    if (attachment) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowedTypes.includes(attachment.type) || attachment.size > 10 * 1024 * 1024) {
        setError("Choose a JPG, PNG, WebP or PDF file no larger than 10 MB.");
        return;
      }
      const safeName = attachment.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100) || "evidence";
      attachmentPath = `${sessionUser.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("visit-evidence")
        .upload(attachmentPath, attachment, { upsert: false, contentType: attachment.type });
      if (uploadError) {
        setError(`Evidence upload failed: ${uploadError.message}`);
        return;
      }
    }
    const { error: saveError } = await supabase.from("field_visits").insert({
      director_id: profile.director_id,
      wasa_id: values.wasa_id,
      visit_date: values.visit_date,
      location: values.location.trim(),
      purpose: values.purpose.trim(),
      activities_performed: values.activities_performed.trim(),
      issues_identified: values.issues_identified.trim() || null,
      instructions_given: values.instructions_given.trim() || null,
      progress_achieved: values.progress_achieved.trim() || null,
      pending_actions: values.pending_actions.trim() || null,
      responsible_officer: values.responsible_officer.trim() || null,
      expected_completion_date: values.expected_completion_date || null,
      remarks: values.remarks.trim() || null,
      attachment_path: attachmentPath,
      submitted_by: sessionUser.id,
    });
    if (saveError) {
      if (attachmentPath) {
        const { error: cleanupError } = await supabase.storage.from("visit-evidence").remove([attachmentPath]);
        setError(cleanupError
          ? `${saveError.message} Evidence cleanup also failed: ${cleanupError.message}`
          : saveError.message);
      } else {
        setError(saveError.message);
      }
    }
    else {
      setVisitEditor(false);
      setNotice("Field visit recorded.");
      await loadData();
    }
  };

  const saveTarget = useCallback(async (values: Record<string, string>): Promise<boolean> => {
    if (!supabase || !sessionUser) {
      setError("Targets cannot be saved while the app is in preview or signed out.");
      return false;
    }
    const targetValue = Number(values.target_value);
    const periodYear = Number(values.period_year);
    const periodMonth = Number(values.period_month);
    if (!values.scope_id || !values.metric || !Number.isFinite(targetValue) || targetValue <= 0
      || !Number.isInteger(periodYear) || periodYear < 2000 || periodYear > 2200
      || (values.period_type === "monthly" && (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12))) {
      setError("Complete all target fields with a valid period and a target greater than zero.");
      return false;
    }
    setError("");
    const row = {
      metric: values.metric,
      period_type: values.period_type,
      period_year: periodYear,
      period_month: values.period_type === "monthly" ? periodMonth : null,
      director_id: values.scope_type === "director" ? values.scope_id : null,
      wasa_id: values.scope_type === "wasa" ? values.scope_id : null,
      target_value: targetValue,
      created_by: sessionUser.id,
    };
    let existingQuery = supabase.from("performance_targets")
      .select("id")
      .eq("metric", row.metric)
      .eq("period_type", row.period_type)
      .eq("period_year", row.period_year);
    existingQuery = values.scope_type === "director"
      ? existingQuery.eq("director_id", values.scope_id)
      : existingQuery.eq("wasa_id", values.scope_id);
    if (row.period_month !== null) existingQuery = existingQuery.eq("period_month", row.period_month);
    const { data: existingTarget, error: findError } = await existingQuery.maybeSingle();
    if (findError) {
      setError(findError.message);
      return false;
    }
    const { error: saveError } = existingTarget
      ? await supabase.from("performance_targets").update(row).eq("id", existingTarget.id)
      : await supabase.from("performance_targets").insert(row);
    if (saveError) {
      setError(saveError.message);
      return false;
    }
    setNotice("Target auto-saved to the shared workspace.");
    await loadData();
    return true;
  }, [sessionUser, loadData]);

  const decideReport = async (report: MonthlyReport, status: "approved" | "returned") => {
    if (!supabase || !sessionUser) return;
    const comment = status === "returned"
      ? window.prompt("Add a correction note for the Director:")?.trim()
      : "";
    if (status === "returned" && !comment) {
      setError("A correction note is required when returning a report.");
      return;
    }
    const { error: updateError } = await supabase.from("monthly_reports").update({
      status,
      reviewed_by: sessionUser.id,
      reviewed_at: new Date().toISOString(),
      review_comment: comment || null,
    }).eq("id", report.id);
    if (updateError) setError(updateError.message);
    else {
      setNotice(status === "approved" ? "Report approved and locked." : "Report returned for correction.");
      await loadData();
    }
  };

  const openEvidence = async (path: string) => {
    if (!supabase) return;
    const newTab = window.open("about:blank", "_blank");
    const { data: signedFile, error: signedUrlError } = await supabase.storage
      .from("visit-evidence")
      .createSignedUrl(path, 60);
    if (signedUrlError) {
      newTab?.close();
      setError(`Evidence could not be opened: ${signedUrlError.message}`);
    } else if (newTab) {
      newTab.opener = null;
      newTab.location.href = signedFile.signedUrl;
    } else {
      setError("Allow pop-ups to open this visit attachment.");
    }
  };

  const createDirector = async (values: Record<string, string>) => {
    if (!supabase) return;
    const { error: invokeError } = await supabase.functions.invoke("admin-create-user", {
      body: { full_name: values.full_name.trim(), email: values.email.trim() },
    });
    if (invokeError) setError(invokeError.message);
    else {
      setManagerEditor(false);
      setNotice("Director account invitation sent.");
      await loadData();
    }
  };

  const saveWasa = async (values: Record<string, string>) => {
    if (!supabase) return;
    const { error: saveError } = await supabase.from("wasas").insert({
      name: values.name.trim(),
      code: values.code.trim() || null,
    });
    if (saveError) setError(saveError.message);
    else {
      setWasaEditor(false);
      setNotice("WASA added.");
      await loadData();
    }
  };

  const assignWasa = async (values: Record<string, string>) => {
    if (!supabase) return;
    const { error: assignError } = await supabase.rpc("admin_assign_wasa", {
      target_director_id: values.director_id,
      target_wasa_id: values.wasa_id,
      assignment_date: values.valid_from,
    });
    if (assignError) setError(assignError.message);
    else {
      setNotice("WASA assignment updated.");
      await loadData();
    }
  };

  const updateDirector = async (director: Director, fullName: string, active: boolean) => {
    if (!supabase) return;
    await runAction(
      async () => await supabase!.rpc("admin_update_director", {
        target_director_id: director.id,
        new_full_name: fullName,
        active,
      }),
      active ? "Director details updated." : "Director deactivated.",
    );
  };

  const openDemoDashboard = () => {
    setPreviewMode(true);
    setSessionUser({ id: "demo-user", email: "demo@example.gov.pk" });
    setProfile({ id: "demo-user", full_name: "Ayesha Rahman", role: "admin", director_id: null });
    setData(demoData);
    setLoading(false);
    setError("");
  };

  const nav = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "monthly" as const, label: "Monthly reports", icon: ClipboardCheck },
    { id: "visits" as const, label: "Field visits", icon: MapPinned },
    { id: "targets" as const, label: "Targets", icon: Target },
    ...(isAdmin ? [
      { id: "team" as const, label: "Directors & WASAs", icon: Users },
      { id: "exports" as const, label: "Reports & exports", icon: FileBarChart2 },
    ] : [
      { id: "exports" as const, label: "My reports", icon: FileBarChart2 },
    ]),
  ];

  if (!isSupabaseConfigured && !previewMode) return <SetupScreen onPreview={openDemoDashboard} />;
  if (loading) return <div className="loading-screen"><span className="spinner" />Loading secure workspace…</div>;
  if (passwordSetup && sessionUser) {
    return <PasswordSetupScreen email={sessionUser.email ?? ""} error={error} onSave={handleSetPassword} />;
  }
  if (!sessionUser || !profile) {
    return (
      <LoginScreen
        error={error}
        onLogin={handleLogin}
        onReset={handleReset}
        profileMissing={Boolean(sessionUser && !profile && error)}
      />
    );
  }

  const visibleReports = data.reports.filter((report) =>
    report.report_year === year
    && report.report_month === month
    && (directorFilter === "all" || report.director_id === directorFilter)
    && (wasaFilter === "all" || report.wasa_id === wasaFilter)
    && `${wasaName(report.wasa_id)} ${directorName(report.director_id)} ${report.status}`
      .toLowerCase().includes(search.toLowerCase()),
  );
  const visibleVisits = data.visits.filter((visit) =>
    new Date(`${visit.visit_date}T00:00:00`).getFullYear() === year
    && new Date(`${visit.visit_date}T00:00:00`).getMonth() + 1 === month
    && (directorFilter === "all" || visit.director_id === directorFilter)
    && (wasaFilter === "all" || visit.wasa_id === wasaFilter)
    && `${wasaName(visit.wasa_id)} ${visit.location} ${visit.purpose} ${directorName(visit.director_id)}`
      .toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${showMobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Droplets size={23} /></div>
          <div><strong>WASA MONITOR</strong><span>DIRECTOR PERFORMANCE</span></div>
          <button className="icon-btn mobile-close" onClick={() => setShowMobileMenu(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} className={page === id ? "nav-item active" : "nav-item"} onClick={() => { setPage(id); setShowMobileMenu(false); }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {id === "monthly" && pendingCount > 0 && <small className="nav-count">{pendingCount}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="security-note"><ShieldCheck size={17} /><span>Secure, role-based access</span></div>
          <button className="user-card" onClick={signOut}>
            <div className="avatar">{profile.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div>
            <div className="user-meta"><strong>{profile.full_name}</strong><span>{isAdmin ? "Administrator" : "Director"}</span></div>
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn mobile-menu" onClick={() => setShowMobileMenu(true)} aria-label="Open menu"><Menu size={21} /></button>
            <div className="breadcrumb">Performance <span>/</span> <b>{nav.find((item) => item.id === page)?.label}</b></div>
          </div>
          <div className="topbar-right">
            <div className="period-label"><CalendarDays size={15} /> Reporting period</div>
            <select aria-label="Reporting month" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
            <select aria-label="Reporting year" value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {Array.from({ length: 10 }, (_, index) => new Date().getFullYear() - index).map((value) => <option key={value}>{value}</option>)}
            </select>
            <button className="icon-btn notification-btn" aria-label="Notifications"><Bell size={18} /><i /></button>
            <button className="icon-btn refresh-btn" onClick={() => void loadData()} aria-label="Refresh data"><RefreshCw size={17} /></button>
          </div>
        </header>

        <div className="page-content">
          {error && <div className="alert error-alert"><AlertCircle size={18} /><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
          {notice && <div className="alert success-alert"><Check size={18} /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={16} /></button></div>}
          {dataLoading && <div className="refresh-indicator"><span className="spinner small" /> Syncing latest database records</div>}
          {page === "overview" && (
            <OverviewPage
              profile={profile}
              isAdmin={isAdmin}
              month={month}
              year={year}
              directors={availableDirectors}
              wasas={availableWasas}
              selectedDirector={directorFilter}
              selectedWasa={wasaFilter}
              setDirector={setDirectorFilter}
              setWasa={setWasaFilter}
              totals={totals}
              reportCount={currentReports.length}
              visitCount={currentVisits.length}
              pendingCount={pendingCount}
              monthlyTrend={monthlyTrend}
              visitsTrend={visitsTrend}
              targetComparison={targetComparison}
              directorPerformance={directorPerformance}
              wasaPerformance={wasaPerformance}
              visits={data.visits}
              reports={data.reports}
              assignments={assignments}
              wasaName={wasaName}
              directorName={directorName}
              onNewReport={() => setReportEditor("new")}
              onNewVisit={() => setVisitEditor(true)}
            />
          )}
          {page === "monthly" && (
            <ReportsPage
              isAdmin={isAdmin}
              month={month}
              year={year}
              reports={visibleReports}
              wasas={availableWasas}
              directors={availableDirectors}
              pendingCount={pendingCount}
              search={search}
              setSearch={setSearch}
              selectedDirector={directorFilter}
              selectedWasa={wasaFilter}
              setDirector={setDirectorFilter}
              setWasa={setWasaFilter}
              wasaName={wasaName}
              directorName={directorName}
              onNew={() => setReportEditor("new")}
              onEdit={(report) => setReportEditor(report)}
              onDecide={decideReport}
              onExportExcel={() => { void downloadExcel(visibleReports, wasaName, directorName).catch((exportError: unknown) => setError(`Excel export failed: ${messageFor(exportError)}`)); }}
              onExportPdf={() => { void downloadPdf(visibleReports, wasaName, directorName).catch((exportError: unknown) => setError(`PDF export failed: ${messageFor(exportError)}`)); }}
            />
          )}
          {page === "visits" && (
            <VisitsPage
              visits={visibleVisits}
              isAdmin={isAdmin}
              search={search}
              setSearch={setSearch}
              directors={availableDirectors}
              wasas={availableWasas}
              selectedDirector={directorFilter}
              selectedWasa={wasaFilter}
              setDirector={setDirectorFilter}
              setWasa={setWasaFilter}
              wasaName={wasaName}
              directorName={directorName}
              onOpenEvidence={openEvidence}
              onNew={() => setVisitEditor(true)}
            />
          )}
          {page === "targets" && (
            <TargetsPage
              targets={data.targets}
              reports={data.reports}
              visits={data.visits}
              directors={availableDirectors}
              wasas={availableWasas}
              isAdmin={isAdmin}
              year={year}
              month={month}
              directorName={directorName}
              wasaName={wasaName}
              onAddDirector={() => setManagerEditor(true)}
              onNew={() => setTargetEditor(true)}
            />
          )}
          {page === "team" && isAdmin && (
            <TeamPage
              directors={data.directors}
              wasas={data.wasas}
              assignments={assignments}
              onNewDirector={() => setManagerEditor(true)}
              onNewWasa={() => setWasaEditor(true)}
              onAssign={assignWasa}
              onUpdateDirector={updateDirector}
              onToggleWasa={async (wasa) => {
                if (!supabase) return;
                await runAction(async () => await supabase!.from("wasas").update({ is_active: !wasa.is_active }).eq("id", wasa.id), wasa.is_active ? "WASA deactivated." : "WASA activated.");
              }}
            />
          )}
          {page === "exports" && (
            <ExportsPage
              reports={data.reports}
              isAdmin={isAdmin}
              month={month}
              year={year}
              wasaName={wasaName}
              directorName={directorName}
              onExportExcel={() => { void downloadExcel(data.reports.filter((r) => r.report_year === year && r.report_month === month), wasaName, directorName).catch((exportError: unknown) => setError(`Excel export failed: ${messageFor(exportError)}`)); }}
              onExportPdf={() => { void downloadPdf(data.reports.filter((r) => r.report_year === year && r.report_month === month), wasaName, directorName).catch((exportError: unknown) => setError(`PDF export failed: ${messageFor(exportError)}`)); }}
            />
          )}
        </div>
        <footer className="page-footer"><span>Director Performance & WASA Monitoring System</span><span>All monetary amounts in PKR / Rs.</span></footer>
      </main>

      {reportEditor && (
        <ReportEditor
          report={reportEditor === "new" ? null : reportEditor}
          wasas={availableWasas}
          month={month}
          year={year}
          onClose={() => setReportEditor(null)}
          onSave={saveReport}
        />
      )}
      {visitEditor && <VisitEditor wasas={availableWasas} onClose={() => setVisitEditor(false)} onSave={saveVisit} />}
      {targetEditor && <TargetEditor
        directors={data.directors.filter((item) => item.is_active)}
        wasas={data.wasas.filter((item) => item.is_active)}
        month={month}
        year={year}
        error={error}
        onClose={() => setTargetEditor(false)}
        onSave={saveTarget}
      />}
      {managerEditor && <DirectorEditor onClose={() => setManagerEditor(false)} onSave={createDirector} />}
      {wasaEditor && <WasaEditor onClose={() => setWasaEditor(false)} onSave={saveWasa} />}
    </div>
  );
}

function SetupScreen({ onPreview }: { onPreview: () => void }) {
  const [copied, setCopied] = useState(false);
  const envText = "VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co\nVITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY";
  const copyEnv = async () => {
    try {
      await navigator.clipboard.writeText(envText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.alert("Copy was blocked by your browser. Copy the values from the panel manually.");
    }
  };
  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-header">
          <div className="setup-icon"><Droplets size={24} /></div>
          <div>
            <p className="eyebrow">WASA PERFORMANCE SYSTEM</p>
            <h1>Workspace setup</h1>
          </div>
        </div>
        <p className="setup-lead">Connect Supabase to enable secure sign-in and live reporting, or preview the dashboard with sample data.</p>
        <div className="setup-steps">
          <div><span>1</span><p><strong>Create the environment file</strong><small>Add the variables to <code>.env</code> in the project root.</small></p></div>
          <div><span>2</span><p><strong>Add your public credentials</strong><small>Use the project URL and publishable/anon key.</small></p></div>
        </div>
        <div className="code-block">
          <button type="button" className="copy-button" onClick={() => void copyEnv()} aria-label="Copy environment variables">
            {copied ? <Check size={14} /> : <Paperclip size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <code>VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co</code>
          <code>VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY</code>
        </div>
        <div className="setup-actions">
          <button className="secondary-btn" type="button" onClick={onPreview}>Preview dashboard</button>
          <button className="primary-btn" type="button" onClick={() => void copyEnv()}>{copied ? "Copied" : "Copy configuration"}</button>
        </div>
        <p className="setup-foot"><LockKeyhole size={14} /> Never add a Supabase service-role key to browser environment variables.</p>
      </div>
    </div>
  );
}

function LoginScreen({ error, onLogin, onReset, profileMissing }: {
  error: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onReset: (email: string) => Promise<void>;
  profileMissing: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    await onLogin(email.trim(), password);
    setBusy(false);
  };
  return (
    <div className="login-screen">
      <div className="login-visual">
        <div className="login-watermark"><Droplets size={290} strokeWidth={0.45} /></div>
        <div className="login-brand"><span className="brand-mark"><Droplets size={23} /></span><strong>WASA MONITOR</strong></div>
        <div className="login-message">
          <p className="eyebrow">DIRECTOR PERFORMANCE</p>
          <h1>One view of<br />operational progress.</h1>
          <p>Securely monitor field activity, revenue recovery and service connections across your WASAs.</p>
          <div className="login-stat"><span className="stat-dot" /> Centralized. Accountable. Actionable.</div>
        </div>
        <span className="login-copyright">Management Information System</span>
      </div>
      <div className="login-panel">
        <form className="login-form" onSubmit={(event) => void submit(event)}>
          <div className="mobile-login-brand"><span className="brand-mark"><Droplets size={22} /></span><strong>WASA MONITOR</strong></div>
          <div className="login-heading"><p className="eyebrow">SECURE WORKSPACE</p><h2>Welcome back</h2><p>Sign in with your authorized account.</p></div>
          {error && <div className={`alert ${profileMissing ? "error-alert" : "error-alert"}`}><AlertCircle size={17} /><span>{profileMissing ? "Your user has no application profile yet. Ask an administrator to finish account setup." : error}</span></div>}
          <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@organization.gov.pk" /></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>
          <button className="primary-btn login-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<ChevronDown size={16} className="login-arrow" /></button>
          <button className="text-button reset-password" type="button" onClick={() => {
            if (!email.trim()) {
              window.alert("Enter your email address first.");
              return;
            }
            void onReset(email.trim());
          }}>Forgot password?</button>
          <div className="login-assurance"><ShieldCheck size={16} /><span>Protected by secure, role-based access controls</span></div>
        </form>
      </div>
    </div>
  );
}

function PasswordSetupScreen({ email, error, onSave }: {
  email: string;
  error: string;
  onSave: (password: string) => Promise<boolean>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setValidationError("");
    if (password !== confirmPassword) {
      setValidationError("The passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setValidationError("Use at least 8 characters for your password.");
      return;
    }
    setBusy(true);
    await onSave(password);
    setBusy(false);
  };

  return (
    <div className="setup-screen">
      <div className="setup-card password-setup-card">
        <div className="setup-header">
          <div className="setup-icon"><LockKeyhole size={22} /></div>
          <div>
            <p className="eyebrow">SECURE WORKSPACE</p>
            <h1>Set your password</h1>
          </div>
        </div>
        <p className="setup-lead">Choose a password for {email || "your account"} to finish setting up your WASA Monitoring access.</p>
        <form className="login-form password-form" onSubmit={(event) => void submit(event)}>
          {(error || validationError) && (
            <div className="alert error-alert"><AlertCircle size={17} /><span>{validationError || error}</span></div>
          )}
          <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <label>Confirm password<input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
          <button className="primary-btn login-submit" disabled={busy}>{busy ? "Saving password…" : "Save password"}</button>
        </form>
        <p className="setup-foot"><ShieldCheck size={14} /> Keep your password private and do not share it.</p>
      </div>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{actions && <div className="heading-actions">{actions}</div>}</div>;
}

function OverviewPage(props: {
  profile: Profile; isAdmin: boolean; month: number; year: number; directors: Director[]; wasas: Wasa[];
  selectedDirector: string; selectedWasa: string; setDirector: (value: string) => void; setWasa: (value: string) => void;
  totals: { demand: number; collection: number; arrears: number; arrearsRecovered: number; surveys: number; water: number; sewer: number; recovery: number | null };
  reportCount: number; visitCount: number; pendingCount: number;
  monthlyTrend: { month: string; demand: number; collected: number; arrearsRecovered: number; surveys: number; water: number; sewer: number }[];
  visitsTrend: { month: string; visits: number }[];
  targetComparison: { label: string; target: number; actual: number }[];
  directorPerformance: { name: string; fullName: string; collection: number; recovery: number; visits: number }[];
  wasaPerformance: { name: string; demand: number; collection: number }[];
  visits: FieldVisit[]; reports: MonthlyReport[]; assignments: Assignment[];
  wasaName: (id: string) => string; directorName: (id: string) => string;
  onNewReport: () => void; onNewVisit: () => void;
}) {
  const monthLabel = `${monthNames[props.month - 1]} ${props.year}`;
  const recentVisits = props.visits.slice(0, 5);
  const currentRecovery = props.totals.recovery;
  const pendingSubmissions = props.reports.filter((item) => item.status === "submitted").length;
  const activeWasaCount = props.isAdmin
    ? props.wasas.length
    : props.assignments.filter((item) => item.director_id === props.profile.director_id).length;
  return (
    <>
      <PageHeading
        eyebrow={props.isAdmin ? "EXECUTIVE OVERVIEW" : "PERSONAL OVERVIEW"}
        title={`Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${props.profile.full_name.split(" ")[0]}`}
        description={`Performance snapshot for ${monthLabel}. Figures reflect submitted records only.`}
        actions={<><button className="secondary-btn" onClick={props.onNewVisit}><MapPinned size={16} /> Log field visit</button><button className="primary-btn" onClick={props.onNewReport}><Plus size={17} /> New monthly report</button></>}
      />
      <div className="filters-bar">
        <div className="filters-intro"><span className="filter-icon"><Settings2 size={16} /></span><div><strong>Dashboard filters</strong><small>Refine your reporting view</small></div></div>
        <label>Director<select value={props.selectedDirector} onChange={(event) => props.setDirector(event.target.value)}><option value="all">{props.isAdmin ? "All Directors" : "My performance"}</option>{props.directors.map((director) => <option key={director.id} value={director.id}>{director.full_name}</option>)}</select></label>
        <label>WASA<select value={props.selectedWasa} onChange={(event) => props.setWasa(event.target.value)}><option value="all">All assigned WASAs</option>{props.wasas.map((wasa) => <option key={wasa.id} value={wasa.id}>{wasa.name}</option>)}</select></label>
        <div className="filter-period"><CalendarDays size={15} />{monthLabel}</div>
      </div>
      <div className="kpi-grid">
        {props.isAdmin && <>
          <KpiCard label="Total Directors" value={props.directors.filter((item) => item.is_active).length} sub="Active accounts" icon={<Users />} tone="navy" />
          <KpiCard label="Total WASAs" value={props.wasas.length} sub="Active WASAs" icon={<Building2 />} tone="blue" />
        </>}
        {!props.isAdmin && <KpiCard label="Assigned WASAs" value={activeWasaCount} sub="Current assignments" icon={<Building2 />} tone="blue" />}
        <KpiCard label="Field visits" value={props.visitCount} sub={`${monthLabel}`} icon={<MapPinned />} tone="green" />
        <KpiCard label="Revenue demand" value={money(props.totals.demand)} sub={`${props.reportCount} submitted reports`} icon={<CircleDollarSign />} tone="navy" compact />
        <KpiCard label="Revenue collected" value={money(props.totals.collection)} sub="Current demand only" icon={<Activity />} tone="green" compact />
        <KpiCard label="Recovery rate" value={currentRecovery == null ? "—" : `${currentRecovery.toFixed(1)}%`} sub="Collection ÷ demand" icon={<BarChart3 />} tone="teal" />
        <KpiCard label="Outstanding arrears" value={money(props.totals.arrears)} sub="Closing arrears balance" icon={<CircleDollarSign />} tone="orange" compact />
        <KpiCard label="Arrears recovered" value={money(props.totals.arrearsRecovered)} sub="Separate from current collection" icon={<Check />} tone="green" compact />
        <KpiCard label="New surveys" value={props.totals.surveys.toLocaleString()} sub="Added this month" icon={<Search />} tone="blue" />
        <KpiCard label="Water connections" value={props.totals.water.toLocaleString()} sub="New connections" icon={<Droplets />} tone="teal" />
        <KpiCard label="Sewer connections" value={props.totals.sewer.toLocaleString()} sub="New connections" icon={<Waves />} tone="navy" />
      </div>
      <div className="section-title-row"><div><p className="eyebrow">PERFORMANCE ANALYTICS</p><h2>Progress at a glance</h2></div><div className="legend-note"><span className="legend-dot green" /> Reporting year {props.year}</div></div>
      <Suspense fallback={<div className="charts-loading">Loading performance analytics…</div>}>
        <OverviewCharts
          monthLabel={monthLabel}
          year={props.year}
          monthlyTrend={props.monthlyTrend}
          visitsTrend={props.visitsTrend}
          directorPerformance={props.directorPerformance}
          wasaPerformance={props.wasaPerformance}
          targetComparison={props.targetComparison}
          pendingCount={props.pendingCount}
          pendingSubmissions={pendingSubmissions}
          reportCount={props.reportCount}
          visitCount={props.visitCount}
        />
      </Suspense>
      <div className="section-title-row lower-section"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Latest field visits</h2></div><span className="table-subtitle">Most recent records</span></div>
      <div className="panel table-panel">
        <div className="table-wrap">
          <table><thead><tr><th>WASA / LOCATION</th><th>DIRECTOR</th><th>VISIT DATE</th><th>PURPOSE</th><th>PROGRESS</th><th>FOLLOW-UP</th></tr></thead>
            <tbody>{recentVisits.length ? recentVisits.map((visit) => <tr key={visit.id}>
              <td><strong>{props.wasaName(visit.wasa_id)}</strong><small>{visit.location}</small></td>
              <td>{props.directorName(visit.director_id)}</td><td>{new Date(`${visit.visit_date}T00:00:00`).toLocaleDateString()}</td>
              <td className="truncate-cell">{visit.purpose}</td><td className="truncate-cell">{visit.progress_achieved || "—"}</td>
              <td>{visit.pending_actions ? <span className="badge badge-warning">Follow-up</span> : <span className="badge badge-success">On track</span>}</td>
            </tr>) : <EmptyRow colSpan={6} text="No field visits recorded for this reporting period." />}</tbody>
          </table>
        </div>
        <div className="panel-footer"><span>Recent logged activity</span><span>{props.visits.length} visits in view</span></div>
      </div>
    </>
  );
}

function KpiCard({ label, value, sub, icon, tone, compact = false }: { label: string; value: string | number; sub: string; icon: ReactNode; tone: string; compact?: boolean }) {
  return <div className={`kpi-card tone-${tone} ${compact ? "kpi-compact" : ""}`}><div className="kpi-top"><span>{label}</span><i>{icon}</i></div><strong title={String(value)}>{value}</strong><small>{sub}</small></div>;
}

function ReportsPage(props: {
  isAdmin: boolean; month: number; year: number; reports: MonthlyReport[]; wasas: Wasa[]; directors: Director[];
  pendingCount: number; search: string; setSearch: (value: string) => void; wasaName: (id: string) => string;
  selectedDirector: string; selectedWasa: string; setDirector: (value: string) => void; setWasa: (value: string) => void;
  directorName: (id: string) => string; onNew: () => void; onEdit: (report: MonthlyReport) => void;
  onDecide: (report: MonthlyReport, status: "approved" | "returned") => void;
  onExportExcel: () => void; onExportPdf: () => void;
}) {
  return <>
    <PageHeading eyebrow="MONTHLY PERFORMANCE" title="WASA reports" description={`Review revenue, arrears and service connection activity for ${monthNames[props.month - 1]} ${props.year}.`} actions={<><button className="secondary-btn" onClick={props.onExportExcel}><FileSpreadsheet size={16} /> Excel</button><button className="primary-btn" onClick={props.onNew}><Plus size={17} /> New report</button></>} />
    <div className="stats-strip">
      <div><span>Reports in period</span><strong>{props.reports.length}</strong></div>
      <div><span>Awaiting review</span><strong>{props.reports.filter((item) => item.status === "submitted").length}</strong></div>
      <div><span>Returned for correction</span><strong>{props.reports.filter((item) => item.status === "returned").length}</strong></div>
      <div><span>Expected reports pending</span><strong className={props.pendingCount ? "text-orange" : ""}>{props.pendingCount}</strong></div>
    </div>
    <div className="panel data-panel">
      <div className="table-toolbar"><div><h3>Monthly submissions</h3><p>Current period · {props.reports.length} records</p></div><div className="toolbar-actions"><select className="toolbar-select" aria-label="Filter by Director" value={props.selectedDirector} onChange={(event) => props.setDirector(event.target.value)}><option value="all">{props.isAdmin ? "All Directors" : "My reports"}</option>{props.directors.map((director) => <option key={director.id} value={director.id}>{director.full_name}</option>)}</select><select className="toolbar-select" aria-label="Filter by WASA" value={props.selectedWasa} onChange={(event) => props.setWasa(event.target.value)}><option value="all">All WASAs</option>{props.wasas.map((wasa) => <option key={wasa.id} value={wasa.id}>{wasa.name}</option>)}</select><label className="search-field"><Search size={16} /><input placeholder="Search…" value={props.search} onChange={(event) => props.setSearch(event.target.value)} /></label><button className="icon-btn export-icon" title="Export PDF" onClick={props.onExportPdf}><ArrowDownToLine size={17} /></button></div></div>
      <div className="table-wrap"><table><thead><tr><th>WASA / DIRECTOR</th><th>DEMAND</th><th>COLLECTION</th><th>RECOVERY</th><th>ARREARS RECOVERED</th><th>CLOSING ARREARS</th><th>STATUS</th><th>ACTION</th></tr></thead>
        <tbody>{props.reports.length ? props.reports.map((report) => <tr key={report.id}>
          <td><strong>{props.wasaName(report.wasa_id)}</strong><small>{props.directorName(report.director_id)}</small></td>
          <td>{money(report.monthly_demand)}</td><td className="amount-strong">{money(report.monthly_collection)}</td><td>{report.recovery_percentage == null ? "—" : `${report.recovery_percentage}%`}</td>
          <td>{money(report.arrears_recovered)}</td><td>{money(report.closing_arrears)}</td><td><StatusBadge status={report.status} /></td>
          <td><div className="row-actions">
            {props.isAdmin && report.status === "submitted" && <>
              <button className="small-action approve" onClick={() => props.onDecide(report, "approved")} title="Approve report"><Check size={15} /></button>
              <button className="small-action return" onClick={() => props.onDecide(report, "returned")} title="Return for correction"><RefreshCw size={14} /></button>
            </>}
            {!props.isAdmin && ["draft", "returned"].includes(report.status) && <button className="small-action edit" onClick={() => props.onEdit(report)} title="Edit report"><Settings2 size={15} /></button>}
            {props.isAdmin && report.status === "approved" && <button className="small-action return" onClick={() => props.onDecide(report, "returned")} title="Reopen report for correction"><RefreshCw size={14} /></button>}
            {report.review_comment && <span className="review-note" title={report.review_comment}><AlertCircle size={14} /></span>}
            {report.status === "approved" && <LockKeyhole size={14} className="locked-icon" />}
          </div></td>
        </tr>) : <EmptyRow colSpan={8} text="No monthly reports match this period and search." />}</tbody>
      </table></div>
      <div className="panel-footer"><span>Current demand collection and arrears recovery are shown separately.</span><span>{props.wasas.length} assigned WASAs available</span></div>
    </div>
    <div className="info-callout"><ShieldCheck size={18} /><div><strong>Approval controls</strong><span>Approved reports are locked. Admins can reopen a report for correction; each review decision is kept in the audit history.</span></div></div>
  </>;
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { approved: "Approved", submitted: "In review", returned: "Returned", draft: "Draft" };
  return <span className={`badge badge-${status}`}>{labels[status] ?? status}</span>;
}

function VisitsPage(props: { visits: FieldVisit[]; isAdmin: boolean; search: string; setSearch: (value: string) => void; directors: Director[]; wasas: Wasa[]; selectedDirector: string; selectedWasa: string; setDirector: (value: string) => void; setWasa: (value: string) => void; wasaName: (id: string) => string; directorName: (id: string) => string; onNew: () => void; onOpenEvidence: (path: string) => void }) {
  return <>
    <PageHeading eyebrow="FIELD OPERATIONS" title="Field visit management" description="Record site visits, outcomes, instructions and follow-up actions." actions={!props.isAdmin && <button className="primary-btn" onClick={props.onNew}><Plus size={17} /> Record a visit</button>} />
    <div className="stats-strip">
      <div><span>Visits in history</span><strong>{props.visits.length}</strong></div>
      <div><span>Open follow-ups</span><strong>{props.visits.filter((item) => Boolean(item.pending_actions)).length}</strong></div>
      <div><span>WASAs visited</span><strong>{new Set(props.visits.map((item) => item.wasa_id)).size}</strong></div>
      <div><span>Directors active</span><strong>{new Set(props.visits.map((item) => item.director_id)).size}</strong></div>
    </div>
    <div className="panel data-panel">
      <div className="table-toolbar"><div><h3>Visit activity timeline</h3><p>Latest field activity and follow-up status</p></div><div className="toolbar-actions"><select className="toolbar-select" aria-label="Filter visits by Director" value={props.selectedDirector} onChange={(event) => props.setDirector(event.target.value)}><option value="all">{props.isAdmin ? "All Directors" : "My visits"}</option>{props.directors.map((director) => <option key={director.id} value={director.id}>{director.full_name}</option>)}</select><select className="toolbar-select" aria-label="Filter visits by WASA" value={props.selectedWasa} onChange={(event) => props.setWasa(event.target.value)}><option value="all">All WASAs</option>{props.wasas.map((wasa) => <option key={wasa.id} value={wasa.id}>{wasa.name}</option>)}</select><label className="search-field"><Search size={16} /><input placeholder="Search activity…" value={props.search} onChange={(event) => props.setSearch(event.target.value)} /></label></div></div>
      <div className="table-wrap"><table><thead><tr><th>DATE / WASA</th><th>DIRECTOR</th><th>LOCATION / PURPOSE</th><th>ACTIVITY / PROGRESS</th><th>ISSUES / INSTRUCTIONS</th><th>FOLLOW-UP</th><th>EVIDENCE</th></tr></thead>
        <tbody>{props.visits.length ? props.visits.map((visit) => <tr key={visit.id}>
          <td><strong>{new Date(`${visit.visit_date}T00:00:00`).toLocaleDateString()}</strong><small>{props.wasaName(visit.wasa_id)}</small></td>
          <td>{props.directorName(visit.director_id)}</td><td><strong>{visit.location}</strong><small>{visit.purpose}</small></td>
          <td className="long-cell"><strong>{visit.activities_performed}</strong><small>{visit.progress_achieved || "No progress note"}</small></td>
          <td className="long-cell"><strong>{visit.issues_identified || "—"}</strong><small>{visit.instructions_given || "No instructions recorded"}</small></td>
          <td>{visit.pending_actions ? <span className="badge badge-warning">{visit.expected_completion_date ? `Due ${new Date(`${visit.expected_completion_date}T00:00:00`).toLocaleDateString()}` : "Pending"}</span> : <span className="badge badge-success">Clear</span>}</td>
          <td>{visit.attachment_path ? <button className="small-action edit" title="Open supporting evidence" onClick={() => props.onOpenEvidence(visit.attachment_path!)}><Paperclip size={15} /></button> : "—"}</td>
        </tr>) : <EmptyRow colSpan={7} text="No field visit records are available." />}</tbody></table></div>
    </div>
  </>;
}

function TargetsPage(props: {
  targets: PerformanceTarget[]; reports: MonthlyReport[]; visits: FieldVisit[]; directors: Director[]; wasas: Wasa[];
  isAdmin: boolean; year: number; month: number; directorName: (id: string) => string; wasaName: (id: string) => string;
  onAddDirector: () => void; onNew: () => void;
}) {
  const [scopeFilter, setScopeFilter] = useState<"all" | "wasa" | "director">("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "monthly" | "annual">("all");
  const [metricFilter, setMetricFilter] = useState("all");
  const [appliedFilters, setAppliedFilters] = useState({ scope: "all", entity: "all", period: "all", metric: "all" });
  const applyFilters = () => setAppliedFilters({ scope: scopeFilter, entity: entityFilter, period: periodFilter, metric: metricFilter });
  const clearFilters = () => {
    setScopeFilter("all");
    setEntityFilter("all");
    setPeriodFilter("all");
    setMetricFilter("all");
    setAppliedFilters({ scope: "all", entity: "all", period: "all", metric: "all" });
  };
  const formatMetric = (metric: string, value: number) => metric === "revenue_collection" || metric === "arrears_recovery" ? money(value) : Math.round(value).toLocaleString();
  const rows = useMemo(() => {
    const targets = props.targets.filter((target) =>
      target.period_year === props.year
      && (target.period_type === "annual" || target.period_month === props.month)
      && (target.director_id ? props.directors.some((director) => director.id === target.director_id) : props.wasas.some((wasa) => wasa.id === target.wasa_id)),
    );
    return targets.map((target) => {
      const reports = props.reports.filter((report) => report.report_year === props.year
        && (target.period_type === "annual" ? report.report_month <= props.month : report.report_month === target.period_month)
        && (report.status === "submitted" || report.status === "approved")
        && (target.wasa_id ? report.wasa_id === target.wasa_id : report.director_id === target.director_id));
      let achieved = 0;
      switch (target.metric) {
        case "revenue_collection": achieved = reports.reduce((sum, row) => sum + numberValue(row.monthly_collection), 0); break;
        case "arrears_recovery": achieved = reports.reduce((sum, row) => sum + numberValue(row.arrears_recovered), 0); break;
        case "surveys": achieved = reports.reduce((sum, row) => sum + numberValue(row.new_surveys), 0); break;
        case "water_connections": achieved = reports.reduce((sum, row) => sum + numberValue(row.new_water_connections), 0); break;
        case "sewer_connections": achieved = reports.reduce((sum, row) => sum + numberValue(row.new_sewer_connections), 0); break;
        case "field_visits":
          achieved = props.visits.filter((visit) => {
            const visitDate = new Date(`${visit.visit_date}T00:00:00`);
            return visitDate.getFullYear() === props.year
              && (target.period_type === "annual" ? visitDate.getMonth() + 1 <= props.month : visitDate.getMonth() + 1 === target.period_month)
              && (target.wasa_id ? visit.wasa_id === target.wasa_id : visit.director_id === target.director_id);
          }).length;
          break;
      }
      const targetValue = Number(target.target_value);
      return {
        target,
        achieved,
        percentage: targetValue > 0 ? achieved / targetValue * 100 : 0,
        remaining: Math.max(targetValue - achieved, 0),
      };
    }).filter(({ target }) =>
      (appliedFilters.scope === "all" || (appliedFilters.scope === "wasa" ? Boolean(target.wasa_id) : Boolean(target.director_id)))
      && (appliedFilters.entity === "all" || target.director_id === appliedFilters.entity || target.wasa_id === appliedFilters.entity)
      && (appliedFilters.period === "all" || target.period_type === appliedFilters.period)
      && (appliedFilters.metric === "all" || target.metric === appliedFilters.metric),
    );
  }, [props.targets, props.reports, props.visits, props.directors, props.wasas, props.year, props.month, appliedFilters]);
  const metCount = rows.filter((row) => row.percentage >= 100).length;
  const belowCount = rows.length - metCount;
  const averageAchievement = rows.length ? rows.reduce((sum, row) => sum + row.percentage, 0) / rows.length : 0;
  return <>
    <PageHeading eyebrow="PERFORMANCE MANAGEMENT" title="Targets & achievement" description={`Monitor monthly and year-to-date performance across WASAs and Directors for ${props.year}.`} actions={props.isAdmin && <><button className="secondary-btn" onClick={props.onAddDirector}><Users size={16} /> Invite Director</button><button className="primary-btn" onClick={props.onNew}><Plus size={17} /> Assign target</button></>} />
    <div className="info-callout"><Target size={18} /><div><strong>Achievement is calculated automatically</strong><span>Monthly actuals use submitted or approved reports and recorded visits. Annual targets show year-to-date actuals through {monthNames[props.month - 1]}; draft and returned reports are excluded.</span></div></div>
    <div className="stats-strip">
      <div><span>Targets in view</span><strong>{rows.length}</strong></div>
      <div><span>Targets met</span><strong>{metCount}</strong></div>
      <div><span>Below target</span><strong>{belowCount}</strong></div>
      <div><span>Average achievement</span><strong>{rows.length ? `${averageAchievement.toFixed(1)}%` : "—"}</strong></div>
    </div>
    <div className="panel data-panel target-table">
      <div className="table-toolbar">
        <div><h3>Search target performance</h3><p>Select the filters below, then choose Search targets. {rows.length} matching targets · annual results are year-to-date through {monthNames[props.month - 1]}.</p></div>
        <div className="toolbar-actions target-search-actions">
          <select className="toolbar-select" aria-label="Filter target scope" value={scopeFilter} onChange={(event) => { setScopeFilter(event.target.value as typeof scopeFilter); setEntityFilter("all"); }}>
            <option value="all">All areas</option><option value="wasa">WASA-wise</option><option value="director">Director-wise</option>
          </select>
          <select className="toolbar-select" aria-label={scopeFilter === "director" ? "Filter by Director" : "Filter by WASA"} value={entityFilter} disabled={scopeFilter === "all"} onChange={(event) => setEntityFilter(event.target.value)}>
            <option value="all">{scopeFilter === "all" ? "Choose scope first" : `All ${scopeFilter === "director" ? "Directors" : "WASAs"}`}</option>
            {scopeFilter === "director"
              ? props.directors.map((director) => <option key={director.id} value={director.id}>{director.full_name}</option>)
              : scopeFilter === "wasa" ? props.wasas.map((wasa) => <option key={wasa.id} value={wasa.id}>{wasa.name}</option>) : null}
          </select>
          <select className="toolbar-select" aria-label="Filter by reporting period" value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as typeof periodFilter)}>
            <option value="all">Monthly + annual</option><option value="monthly">Monthly</option><option value="annual">Annual / YTD</option>
          </select>
          <select className="toolbar-select" aria-label="Filter by performance metric" value={metricFilter} onChange={(event) => setMetricFilter(event.target.value)}>
            <option value="all">All metrics</option>{metrics.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <button className="primary-btn compact-btn target-search-btn" onClick={applyFilters}><Search size={14} /> Search targets</button>
          <button className="secondary-btn compact-btn" onClick={clearFilters}>Clear</button>
        </div>
      </div>
      <div className="table-wrap"><table><thead><tr><th>AREA / ENTITY</th><th>PERIOD</th><th>PERFORMANCE METRIC</th><th>TARGET</th><th>ACHIEVED</th><th>REMAINING</th><th>ACHIEVEMENT</th></tr></thead>
        <tbody>{rows.length ? rows.map(({ target, achieved, percentage, remaining }) => {
          const progressWidth = Math.min(Math.max(percentage, 0), 100);
          return <tr key={target.id}>
            <td><strong>{target.director_id ? props.directorName(target.director_id) : props.wasaName(target.wasa_id!)}</strong><small>{target.director_id ? "Director target" : "WASA target"}</small></td>
            <td>{target.period_type === "annual" ? `${target.period_year} · Annual / YTD` : `${monthNames[(target.period_month ?? 1) - 1]} ${target.period_year}`}</td>
            <td>{metrics.find(([key]) => key === target.metric)?.[1] ?? target.metric}</td><td>{formatMetric(target.metric, Number(target.target_value))}</td><td className="amount-strong">{formatMetric(target.metric, achieved)}</td>
            <td>{formatMetric(target.metric, remaining)}</td><td><div className="achievement-cell"><div className="progress-track"><span style={{ width: `${progressWidth}%` }} /></div><b>{percentage.toFixed(1)}%</b></div></td>
          </tr>;
        }) : <EmptyRow colSpan={7} text="No targets match this report. Try another filter or ask an Admin to assign targets." />}</tbody>
      </table></div>
    </div>
  </>;
}

function TeamPage(props: {
  directors: Director[]; wasas: Wasa[]; assignments: Assignment[];
  onNewDirector: () => void; onNewWasa: () => void; onAssign: (values: Record<string, string>) => void;
  onUpdateDirector: (director: Director, fullName: string, active: boolean) => void;
  onToggleWasa: (wasa: Wasa) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [assignmentForm, setAssignmentForm] = useState(false);
  const openAssignments = (wasaId: string) => props.assignments.find((item) => item.wasa_id === wasaId && !item.valid_to);
  const submitAssign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    props.onAssign(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)])));
    setAssignmentForm(false);
  };
  return <>
    <PageHeading eyebrow="ADMINISTRATION" title="Directors & WASAs" description="Maintain the organization list and active Director–WASA assignments." actions={<><button className="secondary-btn" onClick={props.onNewWasa}><Plus size={16} /> Add WASA</button><button className="primary-btn" onClick={props.onNewDirector}><Users size={16} /> Invite Director</button></>} />
    <div className="stats-strip"><div><span>Active Directors</span><strong>{props.directors.filter((item) => item.is_active).length}</strong></div><div><span>Active WASAs</span><strong>{props.wasas.filter((item) => item.is_active).length}</strong></div><div><span>Current assignments</span><strong>{props.assignments.length}</strong></div><div><span>Unassigned WASAs</span><strong>{props.wasas.filter((item) => item.is_active && !openAssignments(item.id)).length}</strong></div></div>
    <div className="team-grid">
      <div className="panel data-panel"><div className="table-toolbar"><div><h3>Director accounts</h3><p>Invitation, activation and assignment management</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>DIRECTOR</th><th>EMAIL</th><th>WASAs</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>
          {props.directors.length ? props.directors.map((director) => {
            const count = props.assignments.filter((item) => item.director_id === director.id).length;
            return <tr key={director.id}><td>{editing === director.id ? <input className="inline-input" value={editName} onChange={(event) => setEditName(event.target.value)} /> : <strong>{director.full_name}</strong>}</td><td>{director.email}</td><td>{count}</td><td><span className={`badge ${director.is_active ? "badge-approved" : "badge-draft"}`}>{director.is_active ? "Active" : "Inactive"}</span></td><td>{editing === director.id ? <div className="row-actions"><button className="small-action approve" onClick={() => { props.onUpdateDirector(director, editName, director.is_active); setEditing(null); }}><Check size={15} /></button><button className="small-action return" onClick={() => setEditing(null)}><X size={15} /></button></div> : <button className="small-action edit" onClick={() => { setEditing(director.id); setEditName(director.full_name); }} title="Edit Director name"><Settings2 size={15} /></button>}</td></tr>;
          }) : <EmptyRow colSpan={5} text="No Directors added yet." />}
        </tbody></table></div>
      </div>
      <div className="panel data-panel"><div className="table-toolbar"><div><h3>WASA directory</h3><p>Assign a WASA to a Director or maintain its status</p></div><button className="secondary-btn compact-btn" onClick={() => setAssignmentForm(!assignmentForm)}><Settings2 size={15} /> Assign WASA</button></div>
        {assignmentForm && <form className="inline-assignment-form" onSubmit={submitAssign}>
          <label>Director<select name="director_id" required defaultValue=""><option value="" disabled>Select Director</option>{props.directors.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label>
          <label>WASA<select name="wasa_id" required defaultValue=""><option value="" disabled>Select WASA</option>{props.wasas.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Effective date<input name="valid_from" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label><button className="primary-btn compact-btn">Save assignment</button>
        </form>}
        <div className="table-wrap"><table><thead><tr><th>WASA / CODE</th><th>ASSIGNED DIRECTOR</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>
          {props.wasas.length ? props.wasas.map((wasa) => {
            const assignment = openAssignments(wasa.id);
            return <tr key={wasa.id}><td><strong>{wasa.name}</strong><small>{wasa.code || "No code"}</small></td><td>{assignment ? props.directors.find((item) => item.id === assignment.director_id)?.full_name ?? "Unassigned" : "Unassigned"}</td><td><span className={`badge ${wasa.is_active ? "badge-approved" : "badge-draft"}`}>{wasa.is_active ? "Active" : "Inactive"}</span></td><td><button className="small-action edit" title={wasa.is_active ? "Deactivate WASA" : "Activate WASA"} onClick={() => props.onToggleWasa(wasa)}><Settings2 size={15} /></button></td></tr>;
          }) : <EmptyRow colSpan={4} text="No WASAs added yet." />}
        </tbody></table></div>
      </div>
    </div>
    <div className="info-callout"><Users size={18} /><div><strong>Secure account invitations</strong><span>Director logins are created through the protected Supabase Edge Function; the service-role key is never sent to the browser.</span></div></div>
  </>;
}

function ExportsPage(props: { reports: MonthlyReport[]; isAdmin: boolean; month: number; year: number; wasaName: (id: string) => string; directorName: (id: string) => string; onExportExcel: () => void; onExportPdf: () => void }) {
  const rows = props.reports.filter((report) => report.report_year === props.year && report.report_month === props.month);
  return <>
    <PageHeading eyebrow="REPORTING & DATA" title={props.isAdmin ? "Consolidated reports" : "My report history"} description={`Export submitted monthly WASA reports for ${monthNames[props.month - 1]} ${props.year}.`} />
    <div className="export-cards">
      <div className="panel export-card"><div className="export-icon-box excel"><FileSpreadsheet size={22} /></div><div><h3>Excel workbook</h3><p>Download report records with financial, arrears, survey and connection details.</p></div><button className="secondary-btn" onClick={props.onExportExcel}><ArrowDownToLine size={16} /> Download .xlsx</button></div>
      <div className="panel export-card"><div className="export-icon-box pdf"><FileBarChart2 size={22} /></div><div><h3>PDF summary</h3><p>Generate a printable summary of report submissions and recovery results.</p></div><button className="secondary-btn" onClick={props.onExportPdf}><ArrowDownToLine size={16} /> Download .pdf</button></div>
    </div>
    <div className="panel data-panel"><div className="table-toolbar"><div><h3>Consolidated WASA reports</h3><p>{rows.length} available records for current period</p></div><span className="period-chip"><CalendarDays size={14} />{monthNames[props.month - 1]} {props.year}</span></div>
      <div className="table-wrap"><table><thead><tr><th>WASA</th><th>DIRECTOR</th><th>DEMAND</th><th>COLLECTION</th><th>RECOVERY</th><th>ARREARS RECOVERED</th><th>STATUS</th></tr></thead><tbody>
        {rows.length ? rows.map((report) => <tr key={report.id}><td><strong>{props.wasaName(report.wasa_id)}</strong></td><td>{props.directorName(report.director_id)}</td><td>{money(report.monthly_demand)}</td><td>{money(report.monthly_collection)}</td><td>{report.recovery_percentage == null ? "—" : `${report.recovery_percentage}%`}</td><td>{money(report.arrears_recovered)}</td><td><StatusBadge status={report.status} /></td></tr>) : <EmptyRow colSpan={7} text="No records are available for this period." />}
      </tbody></table></div></div>
    <div className="info-callout"><AlertCircle size={18} /><div><strong>Import planning</strong><span>One year of historical Excel data is expected. Review the existing workbook before importing so its columns can be mapped to the approved report fields without silently changing existing records.</span></div></div>
  </>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <tr><td colSpan={colSpan}><div className="empty-row"><div className="empty-icon"><FileBarChart2 size={19} /></div><strong>{text}</strong></div></td></tr>;
}

function Modal({ title, description, onClose, children, wide = false }: { title: string; description: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={`modal-card ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true">
      <div className="modal-heading"><div><p className="eyebrow">DATA ENTRY</p><h2>{title}</h2><p>{description}</p></div><button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>
      {children}
    </div>
  </div>;
}

function ReportEditor({ report, wasas, month, year, onClose, onSave }: {
  report: MonthlyReport | null; wasas: Wasa[]; month: number; year: number; onClose: () => void;
  onSave: (values: Record<string, string>, action: "draft" | "submit") => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const initial: Record<string, string> = {
    wasa_id: report?.wasa_id ?? wasas[0]?.id ?? "",
    report_month: String(report?.report_month ?? month),
    report_year: String(report?.report_year ?? year),
    monthly_demand: String(report?.monthly_demand ?? 0),
    monthly_collection: String(report?.monthly_collection ?? 0),
    opening_arrears: String(report?.opening_arrears ?? 0),
    additional_arrears: String(report?.additional_arrears ?? 0),
    arrears_recovered: String(report?.arrears_recovered ?? 0),
    approved_adjustments: String(report?.approved_adjustments ?? 0),
    opening_surveys: String(report?.opening_surveys ?? 0),
    new_surveys: String(report?.new_surveys ?? 0),
    corrected_surveys: String(report?.corrected_surveys ?? 0),
    removed_surveys: String(report?.removed_surveys ?? 0),
    opening_water_connections: String(report?.opening_water_connections ?? 0),
    new_water_connections: String(report?.new_water_connections ?? 0),
    removed_water_connections: String(report?.removed_water_connections ?? 0),
    opening_sewer_connections: String(report?.opening_sewer_connections ?? 0),
    new_sewer_connections: String(report?.new_sewer_connections ?? 0),
    removed_sewer_connections: String(report?.removed_sewer_connections ?? 0),
  };
  const [values, setValues] = useState(initial);
  const update = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const demand = numberValue(values.monthly_demand);
  const collection = numberValue(values.monthly_collection);
  const arrears = numberValue(values.opening_arrears) + numberValue(values.additional_arrears) - numberValue(values.arrears_recovered) - numberValue(values.approved_adjustments);
  const currentOutstanding = demand - collection;
  const recovery = demand ? collection / demand * 100 : null;
  const formSubmit = async (event: FormEvent<HTMLFormElement>, action: "draft" | "submit") => {
    event.preventDefault();
    setBusy(true);
    await onSave(values, action);
    setBusy(false);
  };
  const saveDraft = async () => {
    setBusy(true);
    await onSave(values, "draft");
    setBusy(false);
  };
  return <Modal title={report ? "Edit monthly report" : "New monthly WASA report"} description={report ? "Update a draft or returned report, then resubmit it for review." : "Enter this WASA’s monthly results. Balances and recovery are calculated automatically."} onClose={onClose} wide>
    {report && <div className="return-comment"><AlertCircle size={15} /><span>{report.status === "returned" ? report.review_comment || "This report was returned for correction." : "Draft report"}</span></div>}
    <form className="form-body" onSubmit={(event) => void formSubmit(event, "submit")}>
      <div className="form-grid three">
        <Field label="WASA" required><select value={values.wasa_id} disabled={Boolean(report)} required onChange={(event) => update("wasa_id", event.target.value)}>{wasas.map((wasa) => <option key={wasa.id} value={wasa.id}>{wasa.name}</option>)}</select></Field>
        <Field label="Reporting month"><select disabled={Boolean(report)} value={values.report_month} onChange={(event) => update("report_month", event.target.value)}>{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></Field>
        <Field label="Reporting year"><input type="number" min="2000" max="2200" disabled={Boolean(report)} value={values.report_year} onChange={(event) => update("report_year", event.target.value)} /></Field>
      </div>
      <FormSection title="Current month revenue" hint="Current-demand collection is separate from previous arrears recovery.">
        <div className="form-grid three">
          <NumberField label="Monthly demand (Rs.)" value={values.monthly_demand} onChange={(value) => update("monthly_demand", value)} />
          <NumberField label="Monthly collection (Rs.)" value={values.monthly_collection} onChange={(value) => update("monthly_collection", value)} />
          <ComputedField label="Outstanding current demand" value={money(currentOutstanding)} />
        </div>
        <div className="calculation-strip"><span>Current demand recovery</span><strong>{recovery == null ? "—" : `${recovery.toFixed(2)}%`}</strong><small>Collection ÷ demand</small></div>
      </FormSection>
      <FormSection title="Arrears recovery" hint="Closing arrears = opening + added − recovered − approved adjustments.">
        <div className="form-grid three">
          <NumberField label="Opening arrears (Rs.)" value={values.opening_arrears} onChange={(value) => update("opening_arrears", value)} />
          <NumberField label="Additional arrears (Rs.)" value={values.additional_arrears} onChange={(value) => update("additional_arrears", value)} />
          <NumberField label="Arrears recovered (Rs.)" value={values.arrears_recovered} onChange={(value) => update("arrears_recovered", value)} />
          <NumberField label="Approved adjustments (Rs.)" value={values.approved_adjustments} onChange={(value) => update("approved_adjustments", value)} />
          <ComputedField label="Closing arrears" value={money(arrears)} />
        </div>
      </FormSection>
      <FormSection title="Consumer surveys" hint="Corrections are recorded for reporting but do not change the consumer count.">
        <div className="form-grid four">
          <NumberField label="Opening surveyed" value={values.opening_surveys} onChange={(value) => update("opening_surveys", value)} integer />
          <NumberField label="New surveys added" value={values.new_surveys} onChange={(value) => update("new_surveys", value)} integer />
          <NumberField label="Surveys corrected" value={values.corrected_surveys} onChange={(value) => update("corrected_surveys", value)} integer />
          <NumberField label="Surveys removed" value={values.removed_surveys} onChange={(value) => update("removed_surveys", value)} integer />
        </div>
        <div className="computed-inline">Calculated closing surveyed consumers: <strong>{(numberValue(values.opening_surveys) + numberValue(values.new_surveys) - numberValue(values.removed_surveys)).toLocaleString()}</strong></div>
      </FormSection>
      <FormSection title="Water and sewer connections" hint="Closing totals and net changes are calculated from opening, additions and removals.">
        <div className="connection-grid">
          <ConnectionFields title="Water connections" prefix="water" values={values} update={update} />
          <ConnectionFields title="Sewerage connections" prefix="sewer" values={values} update={update} />
        </div>
      </FormSection>
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button type="button" className="secondary-btn" disabled={busy} onClick={() => void saveDraft()}>Save draft</button><button className="primary-btn" disabled={busy}>{busy ? "Saving…" : "Submit for review"}<Check size={16} /></button></div>
    </form>
  </Modal>;
}

function ConnectionFields({ title, prefix, values, update }: { title: string; prefix: "water" | "sewer"; values: Record<string, string>; update: (key: string, value: string) => void }) {
  const keys = prefix === "water"
    ? ["opening_water_connections", "new_water_connections", "removed_water_connections"]
    : ["opening_sewer_connections", "new_sewer_connections", "removed_sewer_connections"];
  const opening = numberValue(values[keys[0]]);
  const added = numberValue(values[keys[1]]);
  const removed = numberValue(values[keys[2]]);
  return <div className="connection-box"><h4>{title}</h4><div className="form-grid three">
    <NumberField label="Opening" value={values[keys[0]]} onChange={(value) => update(keys[0], value)} integer />
    <NumberField label="New added" value={values[keys[1]]} onChange={(value) => update(keys[1], value)} integer />
    <NumberField label="Removed" value={values[keys[2]]} onChange={(value) => update(keys[2], value)} integer />
  </div><div className="connection-result"><span>Closing</span><strong>{(opening + added - removed).toLocaleString()}</strong><span>Net change <b>{added - removed >= 0 ? "+" : ""}{(added - removed).toLocaleString()}</b></span></div></div>;
}

function VisitEditor({ wasas, onClose, onSave }: { wasas: Wasa[]; onClose: () => void; onSave: (values: Record<string, string>, attachment: File | null) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const attachmentValue = formData.get("attachment");
    const attachment = attachmentValue instanceof File && attachmentValue.size ? attachmentValue : null;
    formData.delete("attachment");
    const entries = Object.fromEntries(formData.entries());
    await onSave(Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, String(value)])), attachment);
    setBusy(false);
  };
  return <Modal title="Record a field visit" description="Capture the activity, findings, progress and follow-up actions." onClose={onClose} wide>
    <form className="form-body" onSubmit={(event) => void submit(event)}>
      <div className="form-grid three">
        <Field label="Visit date" required><input type="date" name="visit_date" required defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
        <Field label="WASA visited" required><select name="wasa_id" required defaultValue={wasas[0]?.id ?? ""}>{wasas.map((wasa) => <option key={wasa.id} value={wasa.id}>{wasa.name}</option>)}</select></Field>
        <Field label="Location / area" required><input name="location" required placeholder="Area, zone or facility" /></Field>
        <Field label="Purpose of visit" required><input name="purpose" required placeholder="Purpose" /></Field>
        <Field label="Responsible officer"><input name="responsible_officer" placeholder="Officer name / designation" /></Field>
        <Field label="Expected completion date"><input type="date" name="expected_completion_date" /></Field>
      </div>
      <Field label="Activities performed" required><textarea name="activities_performed" required rows={2} placeholder="Describe the activity conducted…" /></Field>
      <div className="form-grid two">
        <Field label="Issues identified"><textarea name="issues_identified" rows={2} /></Field>
        <Field label="Instructions given"><textarea name="instructions_given" rows={2} /></Field>
        <Field label="Progress achieved"><textarea name="progress_achieved" rows={2} /></Field>
        <Field label="Pending actions"><textarea name="pending_actions" rows={2} /></Field>
      </div>
      <Field label="Remarks"><textarea name="remarks" rows={2} /></Field>
      <Field label="Supporting photo or document (optional)"><input type="file" name="attachment" accept="image/jpeg,image/png,image/webp,application/pdf" /></Field>
      <div className="form-note"><ShieldCheck size={15} /> Your identity and submission timestamp are recorded automatically.</div>
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? "Saving…" : "Save field visit"}<Check size={16} /></button></div>
    </form>
  </Modal>;
}

function TargetEditor({ directors, wasas, month, year, error, onClose, onSave }: { directors: Director[]; wasas: Wasa[]; month: number; year: number; error: string; onClose: () => void; onSave: (values: Record<string, string>) => Promise<boolean> }) {
  const [values, setValues] = useState<Record<string, string>>({
    scope_type: "wasa",
    scope_id: "",
    metric: metrics[0][0],
    period_type: "monthly",
    period_year: String(year),
    period_month: String(month),
    target_value: "",
  });
  const [saveState, setSaveState] = useState<"incomplete" | "pending" | "saving" | "saved" | "error">("incomplete");
  const [retryCount, setRetryCount] = useState(0);
  const saveTimer = useRef<number | null>(null);
  const lastSavedKey = useRef("");
  const saving = useRef(false);
  const saveKey = JSON.stringify(values);
  const targetValue = Number(values.target_value);
  const complete = Boolean(values.scope_id)
    && Number.isFinite(targetValue) && targetValue > 0
    && Number.isInteger(Number(values.period_year))
    && (values.period_type === "annual" || (Number.isInteger(Number(values.period_month)) && Number(values.period_month) >= 1 && Number(values.period_month) <= 12));
  const isBusy = saveState === "saving";
  const updateValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const saveCurrentValues = useCallback(async () => {
    if (saving.current) return false;
    saving.current = true;
    setSaveState("saving");
    try {
      const saved = await onSave(values);
      if (saved) {
        lastSavedKey.current = saveKey;
        setSaveState("saved");
      } else {
        setSaveState("error");
      }
      return saved;
    } finally {
      saving.current = false;
    }
  }, [onSave, saveKey, values]);

  useEffect(() => {
    if (!complete) {
      setSaveState("incomplete");
      return;
    }
    if (saveKey === lastSavedKey.current) {
      setSaveState("saved");
      return;
    }
    setSaveState("pending");
    const timer = window.setTimeout(() => {
      saveTimer.current = null;
      void saveCurrentValues();
    }, 900);
    saveTimer.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (saveTimer.current === timer) saveTimer.current = null;
    };
  }, [complete, retryCount, saveCurrentValues, saveKey]);

  const closeEditor = async () => {
    if (saving.current) return;
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (complete && saveKey !== lastSavedKey.current) {
      const saved = await saveCurrentValues();
      if (!saved) {
        if (window.confirm("This target could not be saved. Close and discard the unsaved changes?")) onClose();
        return;
      }
    }
    onClose();
  };

  const statusText = {
    incomplete: "Choose an area and enter a target. Changes save automatically after a short pause.",
    pending: "Changes will save automatically…",
    saving: "Saving to the shared workspace…",
    saved: "Saved. This target is available to the Admin and the relevant Director/WASA users.",
    error: `Could not save${error ? `: ${error}` : "."}`,
  }[saveState];

  return <Modal title="Assign a performance target" description="Targets save automatically after you complete the required fields." onClose={() => { void closeEditor(); }}>
    <div className="form-body">
      <Field label="Target scope"><select value={values.scope_type} disabled={isBusy} onChange={(event) => setValues((current) => ({ ...current, scope_type: event.target.value, scope_id: "" }))}><option value="wasa">Individual WASA</option><option value="director">Director</option></select></Field>
      <Field label={values.scope_type === "wasa" ? "WASA" : "Director"}><select value={values.scope_id} disabled={isBusy} onChange={(event) => updateValue("scope_id", event.target.value)}><option value="">Select {values.scope_type === "wasa" ? "a WASA" : "a Director"}</option>{(values.scope_type === "wasa" ? wasas : directors).map((item) => <option key={item.id} value={item.id}>{values.scope_type === "wasa" ? (item as Wasa).name : (item as Director).full_name}</option>)}</select></Field>
      <Field label="Performance measure"><select value={values.metric} disabled={isBusy} onChange={(event) => updateValue("metric", event.target.value)}>{metrics.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
      <div className="form-grid two"><Field label="Target period"><select value={values.period_type} disabled={isBusy} onChange={(event) => updateValue("period_type", event.target.value)}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></Field><Field label="Year"><input type="number" min="2000" max="2200" value={values.period_year} disabled={isBusy} onChange={(event) => updateValue("period_year", event.target.value)} required /></Field></div>
      <Field label="Month (for monthly target)"><select value={values.period_month} disabled={isBusy || values.period_type === "annual"} onChange={(event) => updateValue("period_month", event.target.value)}>{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></Field>
      <Field label="Assigned target"><input type="number" min="0.01" step="0.01" value={values.target_value} disabled={isBusy} onChange={(event) => updateValue("target_value", event.target.value)} placeholder="Enter target amount" required /></Field>
      <div className="form-note"><Target size={15} /><span>Existing target for the same measure, area and period is updated automatically. Saved targets are stored online and shared with users who have access to that Director or WASA.</span></div>
      <div className={`form-note target-save-note ${saveState === "saved" ? "is-saved" : ""} ${saveState === "error" ? "is-error" : ""}`}>
        {saveState === "saved" ? <Check size={15} /> : saveState === "error" ? <AlertCircle size={15} /> : <RefreshCw size={15} />}
        <span>{statusText}</span>
        {saveState === "error" && <button type="button" className="secondary-btn compact-btn" onClick={() => setRetryCount((count) => count + 1)}>Retry</button>}
      </div>
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => { void closeEditor(); }}>Close</button></div>
    </div>
  </Modal>;
}

function DirectorEditor({ onClose, onSave }: { onClose: () => void; onSave: (values: Record<string, string>) => Promise<void> }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const entries = Object.fromEntries(new FormData(event.currentTarget).entries());
    await onSave(Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, String(value)])));
  };
  return <Modal title="Invite a Director" description="An account invitation will be sent securely by Supabase Auth." onClose={onClose}>
    <form className="form-body" onSubmit={(event) => void submit(event)}>
      <Field label="Full name" required><input name="full_name" required minLength={2} placeholder="Director full name" /></Field>
      <Field label="Official email address" required><input name="email" type="email" required placeholder="name@organization.gov.pk" /></Field>
      <div className="form-note"><ShieldCheck size={15} /> This creates a Director identity. WASA access is granted separately through assignments.</div>
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn">Send invitation</button></div>
    </form>
  </Modal>;
}

function WasaEditor({ onClose, onSave }: { onClose: () => void; onSave: (values: Record<string, string>) => Promise<void> }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const entries = Object.fromEntries(new FormData(event.currentTarget).entries());
    await onSave(Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, String(value)])));
  };
  return <Modal title="Add a WASA" description="Create an organization record, then assign it to a Director." onClose={onClose}>
    <form className="form-body" onSubmit={(event) => void submit(event)}>
      <Field label="WASA name" required><input name="name" required placeholder="Enter official WASA name" /></Field>
      <Field label="WASA code (optional)"><input name="code" placeholder="Unique short code" /></Field>
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn">Add WASA</button></div>
    </form>
  </Modal>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="form-field">{label}{required && <i> *</i>}{children}</label>;
}

function NumberField({ label, value, onChange, integer = false }: { label: string; value: string; onChange: (value: string) => void; integer?: boolean }) {
  return <Field label={label}><input type="number" min="0" step={integer ? "1" : "0.01"} value={value} required onChange={(event) => onChange(event.target.value)} /></Field>;
}

function ComputedField({ label, value }: { label: string; value: string }) {
  return <Field label={label}><div className="computed-input">{value}</div></Field>;
}

function FormSection({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return <section className="form-section"><div className="form-section-heading"><h3>{title}</h3><p>{hint}</p></div>{children}</section>;
}

export default App;
