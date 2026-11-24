import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  BarChart3, Building2, CircleDollarSign, ClipboardCheck, MapPinned,
  ShieldCheck, Target, Users, Waves,
} from "lucide-react";

type Props = {
  monthLabel: string;
  year: number;
  monthlyTrend: { month: string; demand: number; collected: number; arrearsRecovered: number; surveys: number; water: number; sewer: number }[];
  visitsTrend: { month: string; visits: number }[];
  directorPerformance: { name: string; fullName: string; collection: number; recovery: number; visits: number }[];
  wasaPerformance: { name: string; demand: number; collection: number }[];
  showWasaScope: boolean;
  targetComparison: { label: string; target: number; actual: number }[];
  scopeTitle: string;
  pendingCount: number;
  pendingSubmissions: number;
  reportCount: number;
  visitCount: number;
};

function money(value: number) {
  return `Rs. ${Math.round(Number(value) || 0).toLocaleString("en-PK")}`;
}

export default function OverviewCharts(props: Props) {
  return (
    <div className="charts-grid">
      <div className="panel chart-panel chart-wide">
        <div className="panel-heading"><div><h3>Revenue demand vs. collection</h3><p>Month-by-month performance · Rs.</p></div><span className="panel-icon"><BarChart3 size={20} /></span></div>
        <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={props.monthlyTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#8290a1" }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8290a1" }} tickFormatter={(value: number) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}m` : value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)} /><Tooltip formatter={(value) => money(Number(value))} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="demand" name="Demand" stroke="#8ba0b5" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="collected" name="Collection" stroke="#168b72" strokeWidth={2.5} dot={{ r: 3, fill: "#168b72" }} /></LineChart></ResponsiveContainer></div>
      </div>
      <div className="panel chart-panel">
        <div className="panel-heading"><div><h3>{props.scopeTitle}</h3><p>{props.showWasaScope ? `Demand vs. collection · ${props.monthLabel}` : `Recovery rate · ${props.monthLabel}`}</p></div><span className="panel-icon">{props.showWasaScope ? <Building2 size={20} /> : <Users size={20} />}</span></div>
        <div className="chart-area">
          {props.showWasaScope
            ? props.wasaPerformance.length
              ? <ResponsiveContainer width="100%" height="100%"><BarChart data={props.wasaPerformance} layout="vertical" margin={{ top: 8, right: 10, left: 4, bottom: 0 }}><CartesianGrid stroke="#edf1f5" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={95} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#607184" }} /><Tooltip formatter={(value) => money(Number(value))} /><Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="demand" name="Demand" fill="#b9c9d4" radius={[0, 4, 4, 0]} barSize={12} /><Bar dataKey="collection" name="Collection" fill="#168b72" radius={[0, 4, 4, 0]} barSize={12} /></BarChart></ResponsiveContainer>
              : <div className="charts-loading">No active WASA districts are assigned to this Director yet.</div>
            : <ResponsiveContainer width="100%" height="100%"><BarChart data={props.directorPerformance} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8290a1" }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8290a1" }} unit="%" /><Tooltip formatter={(value) => `${value}%`} labelFormatter={(label) => props.directorPerformance.find((item) => item.name === label)?.fullName ?? label} /><Bar dataKey="recovery" name="Recovery" radius={[4, 4, 0, 0]}>{props.directorPerformance.map((item, index) => <Cell key={item.fullName} fill={index === 0 ? "#168b72" : "#b9d8d0"} />)}</Bar></BarChart></ResponsiveContainer>}
        </div>
      </div>
      {!props.showWasaScope && <div className="panel chart-panel">
        <div className="panel-heading"><div><h3>Top WASA collections</h3><p>{props.monthLabel} · Rs.</p></div><span className="panel-icon"><Building2 size={20} /></span></div>
        <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={props.wasaPerformance} layout="vertical" margin={{ top: 2, right: 10, left: 4, bottom: 0 }}><CartesianGrid stroke="#edf1f5" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={95} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#607184" }} /><Tooltip formatter={(value) => money(Number(value))} /><Bar dataKey="collection" name="Collected" fill="#168b72" radius={[0, 4, 4, 0]} barSize={14} /></BarChart></ResponsiveContainer></div>
      </div>}
      <div className="panel status-panel">
        <div className="panel-heading"><div><h3>Reporting status</h3><p>For {props.monthLabel}</p></div><span className="panel-icon status-icon"><ClipboardCheck size={20} /></span></div>
        <div className="status-total"><strong>{props.pendingCount}</strong><span>pending or returned reports</span></div>
        <div className="status-row"><span><i className="status-bullet pending" />Awaiting admin review</span><b>{props.pendingSubmissions}</b></div>
        <div className="status-row"><span><i className="status-bullet submitted" />WASAs reported</span><b>{props.reportCount}</b></div>
        <div className="status-row"><span><i className="status-bullet active" />Field visits logged</span><b>{props.visitCount}</b></div>
        <div className="status-foot"><ShieldCheck size={17} /> Figures update from live submissions</div>
      </div>
      <div className="panel chart-panel">
        <div className="panel-heading"><div><h3>Arrears recovery trend</h3><p>Recovered arrears by month · Rs.</p></div><span className="panel-icon"><CircleDollarSign size={20} /></span></div>
        <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={props.monthlyTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8290a1" }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#8290a1" }} tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)} /><Tooltip formatter={(value) => money(Number(value))} /><Line type="monotone" dataKey="arrearsRecovered" name="Arrears recovered" stroke="#dc9850" strokeWidth={2.5} dot={{ r: 2.5 }} /></LineChart></ResponsiveContainer></div>
      </div>
      <div className="panel chart-panel">
        <div className="panel-heading"><div><h3>Field visits by month</h3><p>Recorded visits · {props.year}</p></div><span className="panel-icon"><MapPinned size={20} /></span></div>
        <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={props.visitsTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8290a1" }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#8290a1" }} /><Tooltip /><Bar dataKey="visits" name="Field visits" fill="#4a9a82" radius={[4, 4, 0, 0]} barSize={16} /></BarChart></ResponsiveContainer></div>
      </div>
      <div className="panel chart-panel">
        <div className="panel-heading"><div><h3>Consumer and connection growth</h3><p>New additions by month</p></div><span className="panel-icon"><Waves size={20} /></span></div>
        <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={props.monthlyTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#8290a1" }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#8290a1" }} /><Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: 9 }} /><Line type="monotone" dataKey="surveys" name="Surveys" stroke="#4a9a82" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="water" name="Water" stroke="#4689b5" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="sewer" name="Sewer" stroke="#8974b4" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
      </div>
      <div className="panel chart-panel">
        <div className="panel-heading"><div><h3>Target achievement</h3><p>Actual achievement vs. assigned target</p></div><span className="panel-icon"><Target size={20} /></span></div>
        <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={props.targetComparison} margin={{ top: 8, right: 7, left: -20, bottom: 36 }}><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="label" interval={0} angle={-22} textAnchor="end" height={48} tickLine={false} axisLine={false} tick={{ fontSize: 8, fill: "#8290a1" }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "#8290a1" }} unit="%" /><Tooltip formatter={(value) => `${value}%`} /><Legend iconType="circle" wrapperStyle={{ fontSize: 9 }} /><Bar dataKey="target" name="Target" fill="#c6d2d9" radius={[3, 3, 0, 0]} /><Bar dataKey="actual" name="Achievement" fill="#168b72" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </div>
    </div>
  );
}
