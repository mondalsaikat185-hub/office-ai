import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { BarChart2, UploadCloud, Users, Download, FileImage, Search, FileText, CalendarClock, ShieldAlert, IndianRupee } from 'lucide-react';
import { generateEmployeeReport, EmployeeRecord, parseUploadedExcel, generateGenericExcel, generatePendencyStatement } from '../../lib/excelReports';
import { callGemini, callGeminiStream } from '../../lib/gemini';

export default function ReportScreen() {
    const { activeWorkspaceId, workspaces, diary = [] } = useStore();
    const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
    const officeName = activeWs?.name || 'OFFICE OF THE COMMISSIONER';

    const [activeTab, setActiveTab] = useState<'employees' | 'pendency' | 'retirement' | 'bonds' | 'revenue' | 'analyze' | 'image'>('employees');

    // Employees State
    const [employees, setEmployees] = useState<EmployeeRecord[]>([
        { sl: 1, name: 'John Doe', designation: 'Superintendent', phone: '9876543210', dob: '1980-01-01', doj: '2005-06-15', dor: '2040-01-31', gpfNo: 'CGST/1234', postingStation: 'HQ', status: 'active' }
    ]);
    const [period, setPeriod] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));

    // Bonds State
    const [bonds, setBonds] = useState([
        { id: 1, type: 'Bank Guarantee', party: 'M/s XYZ Ltd', amount: '₹5,00,000', expiryDate: '2026-06-01', status: 'Active' },
        { id: 2, type: 'Bond', party: 'M/s ABC Corp', amount: '₹10,00,000', expiryDate: '2026-05-20', status: 'Active' },
    ]);

    // Revenue State
    const [revenue, setRevenue] = useState([
        { id: 1, month: 'April 2026', totalRevenue: '8,45,00,000', customDuty: '2,50,00,000', cgst: '3,00,00,000', sgst: '2,95,00,000' }
    ]);

    // Analyze State
    const [parsedData, setParsedData] = useState<any[][] | null>(null);
    const [question, setQuestion] = useState('');
    const [analysisResult, setAnalysisResult] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Image State
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);

    const handleAddEmployee = () => {
        setEmployees([...employees, {
            sl: employees.length + 1, name: '', designation: '', phone: '', dob: '', doj: '', dor: '', gpfNo: '', postingStation: '', status: 'active'
        }]);
    };

    const updateEmployee = (index: number, field: keyof EmployeeRecord, value: string) => {
        const newEmps = [...employees];
        (newEmps[index] as any)[field] = value;
        setEmployees(newEmps);
    };

    const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
           const data = await parseUploadedExcel(file);
           setParsedData(data);
        } catch (err: any) {
           alert("Failed to parse Excel: " + err.message);
        }
    };

    const handleAnalyze = async () => {
        if (!parsedData || !question) return;
        setIsAnalyzing(true);
        setAnalysisResult('');
        
        try {
            const dataSample = parsedData.slice(0, 100).map(row => row.join('\t')).join('\n');
            const prompt = `The following is tabular data from an Excel file:\n\`\`\`\n${dataSample}\n\`\`\`\n\nUser's question: "${question}"\n\nAnalyze this data and provide:\n1. Direct answer to the question\n2. Key findings (3-5 bullet points)\n3. A summary table using markdown table syntax\n4. Any anomalies or important observations`;

            await callGeminiStream(prompt, (chunk) => setAnalysisResult(prev => prev + chunk));
        } catch (e: any) {
            setAnalysisResult("Analysis Failed: " + e.message);
        }
        setIsAnalyzing(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
             setImagePreview(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleExtractImage = async () => {
        if (!imagePreview) return;
        setIsExtracting(true);
        try {
            const prompt = `You are an AI extracting tabular data from an official document image. Extract ALL tabular data visible. Return ONLY a valid JSON array of objects, with columns as keys. \nDo not use Markdown wrappers, return raw JSON array starting with [ and ending with ].`;
            // Strip data:image prefix
            const b64 = imagePreview.split(',')[1];
            const res = await callGemini(prompt, { imageBase64: b64 });
            const cleaned = res.text.substring(res.text.indexOf('['), res.text.lastIndexOf(']') + 1);
            const json = JSON.parse(cleaned);
            generateGenericExcel(json, 'Image_Extracted_Report');
            alert('Excel report generated and downloaded!');
        } catch (e: any) {
            alert('Failed to extract: ' + e.message);
        }
        setIsExtracting(false);
    };

    const getRetiringEmployees = () => {
        const now = new Date();
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(now.getFullYear() + 1);
        
        return employees.filter(emp => {
            if (!emp.dor) return false;
            const dor = new Date(emp.dor);
            return dor > now && dor <= oneYearFromNow;
        });
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            <header className="mb-8 border-b-2 border-black/10 dark:border-white/10 pb-4">
               <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4 text-sky-500">
                 <BarChart2 className="w-8 h-8" /> Reports & Analytics
               </h1>
               <p className="text-black dark:text-white/50 text-sm mt-2">Generate Excel reports, analyze data, and extract tables from images.</p>
            </header>

            <div className="flex border-b border-black/20 dark:border-white/20 mb-6 gap-4 text-sm font-bold uppercase tracking-widest overflow-x-auto">
               <button onClick={() => setActiveTab('employees')} className={`pb-2 border-b-4 transition-colors p-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'employees' ? 'border-sky-500 text-sky-500' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                 <Users className="w-4 h-4"/> Employee Statement
               </button>
               <button onClick={() => setActiveTab('pendency')} className={`pb-2 border-b-4 transition-colors p-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'pendency' ? 'border-blue-500 text-blue-500' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                 <FileText className="w-4 h-4"/> Pendency Statement
               </button>
               <button onClick={() => setActiveTab('retirement')} className={`pb-2 border-b-4 transition-colors p-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'retirement' ? 'border-orange-500 text-orange-500' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                 <CalendarClock className="w-4 h-4"/> Retirement Alert
               </button>
               <button onClick={() => setActiveTab('bonds')} className={`pb-2 border-b-4 transition-colors p-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'bonds' ? 'border-red-500 text-red-500' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                 <ShieldAlert className="w-4 h-4"/> BG/Bond Expiry
               </button>
               <button onClick={() => setActiveTab('revenue')} className={`pb-2 border-b-4 transition-colors p-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'revenue' ? 'border-emerald-500 text-emerald-500' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                 <IndianRupee className="w-4 h-4"/> Revenue
               </button>
               <button onClick={() => setActiveTab('analyze')} className={`pb-2 border-b-4 transition-colors p-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'analyze' ? 'border-purple-500 text-purple-500' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                 <Search className="w-4 h-4"/> Analyze Excel
               </button>
               <button onClick={() => setActiveTab('image')} className={`pb-2 border-b-4 transition-colors p-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'image' ? 'border-emerald-500 text-emerald-500' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                 <FileImage className="w-4 h-4"/> Image to Excel
               </button>
            </div>

            {activeTab === 'employees' && (
                <div className="space-y-6">
                    <div className="flex gap-4 items-end bg-white/50 dark:bg-black/50 p-4 border border-black/20 dark:border-white/20">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-sky-500 block mb-1">Report Period</label>
                            <input type="text" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-black/20 dark:border-white/20 p-2 text-sm" />
                        </div>
                        <button onClick={() => generateEmployeeReport(employees, officeName, period)} className="bg-sky-600 hover:bg-sky-500 text-white font-bold uppercase tracking-widest text-xs px-6 py-2 flex items-center gap-2">
                            <Download className="w-4 h-4" /> Download Excel
                        </button>
                    </div>

                    <div className="overflow-x-auto bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-4">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-black/20 dark:border-white/20">
                                    {['Name', 'Designation', 'Phone', 'DOB', 'DOJ', 'DOR', 'GPF No.', 'Station', 'Status'].map(h => <th key={h} className="p-2 font-bold uppercase tracking-widest text-[10px]">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp, idx) => (
                                    <tr key={idx} className="border-b border-black/10 dark:border-white/10">
                                        <td className="p-1"><input value={emp.name} onChange={e=>updateEmployee(idx, 'name', e.target.value)} className="w-24 bg-transparent border-b border-black/20 outline-none" /></td>
                                        <td className="p-1"><input value={emp.designation} onChange={e=>updateEmployee(idx, 'designation', e.target.value)} className="w-24 bg-transparent border-b border-black/20 outline-none" /></td>
                                        <td className="p-1"><input value={emp.phone} onChange={e=>updateEmployee(idx, 'phone', e.target.value)} className="w-24 bg-transparent border-b border-black/20 outline-none" /></td>
                                        <td className="p-1"><input type="date" value={emp.dob} onChange={e=>updateEmployee(idx, 'dob', e.target.value)} className="w-28 bg-transparent border-b border-black/20 outline-none" /></td>
                                        <td className="p-1"><input type="date" value={emp.doj} onChange={e=>updateEmployee(idx, 'doj', e.target.value)} className="w-28 bg-transparent border-b border-black/20 outline-none" /></td>
                                        <td className="p-1"><input type="date" value={emp.dor} onChange={e=>updateEmployee(idx, 'dor', e.target.value)} className="w-28 bg-transparent border-b border-black/20 outline-none" /></td>
                                        <td className="p-1"><input value={emp.gpfNo} onChange={e=>updateEmployee(idx, 'gpfNo', e.target.value)} className="w-24 bg-transparent border-b border-black/20 outline-none" /></td>
                                        <td className="p-1"><input value={emp.postingStation} onChange={e=>updateEmployee(idx, 'postingStation', e.target.value)} className="w-24 bg-transparent border-b border-black/20 outline-none" /></td>
                                        <td className="p-1">
                                            <select value={emp.status} onChange={e=>updateEmployee(idx, 'status', e.target.value as any)} className="w-20 bg-transparent border-b border-black/20 outline-none">
                                                <option value="active">Active</option>
                                                <option value="retired">Retired</option>
                                                <option value="transferred">Shared</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={handleAddEmployee} className="mt-4 border border-black/20 p-2 text-xs font-bold uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full">+ Add Row</button>
                    </div>
                </div>
            )}

            {activeTab === 'pendency' && (
                <div className="space-y-6">
                    <div className="flex gap-4 items-end bg-white/50 dark:bg-black/50 p-4 border border-black/20 dark:border-white/20">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-blue-500 block mb-1">Report Period</label>
                            <input type="text" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-black/20 dark:border-white/20 p-2 text-sm" />
                        </div>
                        <button onClick={() => generatePendencyStatement(diary, officeName, period)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest text-xs px-6 py-2 flex items-center gap-2">
                            <Download className="w-4 h-4" /> Download Pendency Report
                        </button>
                    </div>
                    <div className="border border-blue-500/30 bg-blue-500/5 p-6">
                        <h3 className="font-bold uppercase tracking-widest text-blue-500 mb-2">Pendency Statement (Monthly Report)</h3>
                        <p className="text-sm opacity-80 mb-4">Export the current diary entries as a pendency statement for official reporting.</p>
                        <ul className="text-sm space-y-2 opacity-80 list-disc list-inside">
                            <li>Includes all pending Hearings, Deadlines, and Meetings.</li>
                            <li>Automatically filters out completed tasks.</li>
                            <li>Formats the excel matching official CBIC guidelines.</li>
                        </ul>
                    </div>
                </div>
            )}

            {activeTab === 'retirement' && (
                <div className="space-y-6">
                    <div className="flex gap-4 items-center bg-white/50 dark:bg-black/50 p-4 border border-black/20 dark:border-white/20 justify-between">
                        <div className="flex-1">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-orange-500">Upcoming Retirements (Next 12 Months)</h3>
                        </div>
                        <button onClick={() => {
                            const retiring = getRetiringEmployees();
                            generateGenericExcel(retiring.map(r => ({ Name: r.name, Designation: r.designation, DOR: r.dor, 'GPF No': r.gpfNo })), 'Retirement_Alert');
                        }} className="bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-widest text-xs px-6 py-2 flex items-center gap-2">
                            <Download className="w-4 h-4" /> Download Alert
                        </button>
                    </div>

                    <div className="overflow-x-auto bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-4">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-black/20 dark:border-white/20">
                                    {['Name', 'Designation', 'Date of Retirement', 'Days Left'].map(h => <th key={h} className="p-2 font-bold uppercase tracking-widest text-[10px] text-orange-600">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {getRetiringEmployees().map((emp, idx) => {
                                    const daysLeft = Math.ceil((new Date(emp.dor).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                    return (
                                        <tr key={idx} className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-orange-600 font-bold">
                                            <td className="p-2">{emp.name}</td>
                                            <td className="p-2">{emp.designation}</td>
                                            <td className="p-2">{new Date(emp.dor).toLocaleDateString('en-IN')}</td>
                                            <td className="p-2">{daysLeft} days</td>
                                        </tr>
                                    );
                                })}
                                {getRetiringEmployees().length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-black/40 dark:text-white/40 font-bold uppercase tracking-widest text-xs">No imminent retirements found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'bonds' && (
                <div className="space-y-6">
                    <div className="flex gap-4 items-center bg-white/50 dark:bg-black/50 p-4 border border-black/20 dark:border-white/20 justify-between">
                        <div className="flex-1">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-red-500">Upcoming BG/Bond Expiries</h3>
                        </div>
                        <button onClick={() => {
                            generateGenericExcel(bonds, 'Bond_Expiry_Alert');
                        }} className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest text-xs px-6 py-2 flex items-center gap-2">
                            <Download className="w-4 h-4" /> Export Register
                        </button>
                    </div>

                    <div className="overflow-x-auto bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-4">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-black/20 dark:border-white/20">
                                    {['Type', 'Party Name', 'Amount', 'Expiry Date', 'Days Left'].map(h => <th key={h} className="p-2 font-bold uppercase tracking-widest text-[10px] text-red-600">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {bonds.map((bond, idx) => {
                                    const daysLeft = Math.ceil((new Date(bond.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                    return (
                                        <tr key={idx} className={`border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-bold ${daysLeft < 30 ? 'text-red-500' : 'text-black/70 dark:text-white/70'}`}>
                                            <td className="p-2">{bond.type}</td>
                                            <td className="p-2">{bond.party}</td>
                                            <td className="p-2">{bond.amount}</td>
                                            <td className="p-2">{new Date(bond.expiryDate).toLocaleDateString('en-IN')}</td>
                                            <td className="p-2">{daysLeft > 0 ? `${daysLeft} days` : 'Expired!'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'revenue' && (
                <div className="space-y-6">
                    <div className="flex gap-4 items-center bg-white/50 dark:bg-black/50 p-4 border border-black/20 dark:border-white/20 justify-between">
                        <div className="flex-1">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500">Monthly Revenue Collection Statement</h3>
                        </div>
                        <button onClick={() => {
                            generateGenericExcel(revenue, 'Revenue_Statement');
                        }} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest text-xs px-6 py-2 flex items-center gap-2">
                            <Download className="w-4 h-4" /> Download Statement
                        </button>
                    </div>

                    <div className="overflow-x-auto bg-white/50 dark:bg-black/50 border border-black/20 dark:border-white/20 p-4">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-black/20 dark:border-white/20">
                                    {['Month', 'Total Revenue', 'Customs Duty', 'CGST', 'SGST'].map(h => <th key={h} className="p-2 font-bold uppercase tracking-widest text-[10px] text-emerald-600">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {revenue.map((r, idx) => (
                                    <tr key={idx} className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-bold">
                                        <td className="p-2">{r.month}</td>
                                        <td className="p-2">₹ {r.totalRevenue}</td>
                                        <td className="p-2">₹ {r.customDuty}</td>
                                        <td className="p-2">₹ {r.cgst}</td>
                                        <td className="p-2">₹ {r.sgst}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


            {activeTab === 'analyze' && (
                <div className="space-y-6">
                    <div className="border-2 border-dashed border-black/20 dark:border-white/20 p-8 text-center bg-white/50 dark:bg-black/50">
                        <UploadCloud className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <h3 className="font-bold uppercase tracking-widest text-sm mb-2">Upload Excel File</h3>
                        <p className="text-xs opacity-60 mb-4">Upload an external Excel report to analyze its contents using AI.</p>
                        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleUploadExcel} className="block w-full max-w-sm mx-auto text-sm border p-2" />
                    </div>

                    {parsedData && (
                         <div className="space-y-4 bg-white/50 dark:bg-black/50 p-4 border border-black/20 dark:border-white/20">
                             <div className="flex items-center justify-between">
                                 <h4 className="font-bold uppercase text-xs tracking-widest text-[#0088cc]">Preview Data ({parsedData.length} rows detected)</h4>
                             </div>
                             <div className="text-xs bg-white dark:bg-neutral-900 border p-2 max-h-40 overflow-y-auto font-mono whitespace-pre opacity-70">
                                 {parsedData.slice(0, 5).map(r => r.join(' | ')).join('\n')}
                                 {parsedData.length > 5 && '\n...'}
                             </div>
                             
                             <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-black/50">Ask AI about this data:</label>
                                <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. Which employees are retiring in 2025? Summarize in a table." className="w-full bg-white dark:bg-neutral-900 border border-black/20 p-2 text-sm outline-none min-h-[80px]" />
                                <button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase text-xs px-6 py-2 disabled:opacity-50">
                                   {isAnalyzing ? 'Analyzing...' : 'Analyze Data'}
                                </button>
                             </div>
                         </div>
                    )}
                    
                    {analysisResult && (
                        <div className="mt-6 bg-purple-50 dark:bg-purple-950/20 border border-purple-500/30 p-6">
                            <h4 className="font-bold uppercase tracking-widest text-xs text-purple-600 mb-4">Analysis Result</h4>
                            <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap">{analysisResult}</div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'image' && (
                 <div className="space-y-6">
                     <div className="border border-black/20 dark:border-white/20 p-8 text-center bg-white/50 dark:bg-black/50">
                         <FileImage className="w-12 h-12 mx-auto mb-4 opacity-50" />
                         <h3 className="font-bold uppercase tracking-widest text-sm mb-2">Upload Screenshot or Photo of Data</h3>
                         <p className="text-xs opacity-60 mb-4">The AI will extract any tabular data from the image and export it to an Excel file.</p>
                         <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full max-w-sm mx-auto text-sm border p-2" />
                     </div>
                     {imagePreview && (
                         <div className="border border-emerald-500/50 p-4 flex flex-col md:flex-row gap-6 bg-emerald-500/5">
                             <div className="flex-1">
                                 <img src={imagePreview} className="max-h-[300px] object-contain mx-auto border border-black/10" alt="Preview"/>
                             </div>
                             <div className="flex-1 flex flex-col justify-center items-center text-center">
                                 <p className="text-sm mb-6 max-w-xs font-bold">Image loaded successfully. Ready to convert to Excel.</p>
                                 <button onClick={handleExtractImage} disabled={isExtracting} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-xs px-8 py-3 tracking-widest disabled:opacity-50">
                                     {isExtracting ? 'Extracting Data...' : 'Download as Excel'}
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>
            )}
        </div>
    );
}
