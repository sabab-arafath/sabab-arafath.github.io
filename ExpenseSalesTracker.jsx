
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

export default function ExpenseSalesTracker() {
  const sessionData = useSession();
  const session = sessionData?.data;
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ type: 'expense', category: '', amount: '', description: '' });
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [mode, setMode] = useState('login');
  const router = useRouter();

  useEffect(() => {
    // Fetch entries from backend here (if connected)
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newEntry = { ...form, amount: parseFloat(form.amount), date: new Date().toISOString() };
    setEntries([newEntry, ...entries]);
    setForm({ type: 'expense', category: '', amount: '', description: '' });
  };

  const handleAuth = async () => {
    try {
      await signIn('credentials', {
        redirect: false,
        email: authForm.email,
        password: authForm.password
      });
    } catch (err) {
      console.error("Authentication error", err);
    }
  };

  const filteredEntries = filter === 'all' ? entries : entries.filter((e) => e.type === filter);

  const total = filteredEntries.reduce((acc, item) => {
    return item.type === 'sale' ? acc + item.amount : acc - item.amount;
  }, 0);

  const chartData = entries.reduce((acc, entry) => {
    const date = new Date(entry.date).toLocaleDateString();
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing[entry.type] += entry.amount;
    } else {
      acc.push({ date, sale: entry.type === 'sale' ? entry.amount : 0, expense: entry.type === 'expense' ? entry.amount : 0 });
    }
    return acc;
  }, []);

  const exportCSV = () => {
    const headers = ["Date", "Type", "Category", "Amount", "Description"];
    const rows = entries.map(e => [
      new Date(e.date).toLocaleDateString(),
      e.type,
      e.category,
      e.amount,
      e.description || ''
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "entries.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    const body = entries.map(e => [
      new Date(e.date).toLocaleDateString(),
      e.type,
      e.category,
      e.amount.toFixed(2),
      e.description || ''
    ]);

    const docDefinition = {
      content: [
        { text: 'Expense & Sales Report', style: 'header' },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*', '*', '*'],
            body: [
              ['Date', 'Type', 'Category', 'Amount', 'Description'],
              ...body
            ]
          }
        }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10]
        }
      }
    };

    pdfMake.createPdf(docDefinition).download("entries.pdf");
  };

  if (!session) {
    return (
      <div className="max-w-sm mx-auto p-8 space-y-4">
        <h2 className="text-xl text-center font-semibold">{mode === 'login' ? 'Sign In' : 'Sign Up'} to use the Tracker</h2>
        <Input type="email" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
        <Input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
        <Button className="w-full" onClick={handleAuth}>{mode === 'login' ? 'Login' : 'Register'}</Button>
        <div className="text-center">
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-blue-500 text-sm underline">
            {mode === 'login' ? 'New user? Register here' : 'Have an account? Login'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Expense & Sales Tracker</h1>
        <Button variant="outline" onClick={() => signOut()}>Sign Out</Button>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-4">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
            <Input
              type="number"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
            <Input
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Button type="submit">Add Entry</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Balance: ৳{total.toFixed(2)}</h2>
            <Select value={filter} onValueChange={(val) => setFilter(val)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="sale">Sales</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportCSV}>Export CSV</Button>
            <Button variant="secondary" onClick={exportPDF}>Export PDF</Button>
          </div>

          <div className="space-y-2">
            {filteredEntries.map((entry, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg shadow border flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold">{entry.category} ({entry.type})</div>
                  <div className="text-sm text-gray-500">{entry.description || 'No description'}</div>
                </div>
                <div className={entry.type === 'sale' ? 'text-green-600' : 'text-red-600'}>
                  ৳{entry.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sale" fill="#16a34a" name="Sales" />
                <Bar dataKey="expense" fill="#dc2626" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}        
