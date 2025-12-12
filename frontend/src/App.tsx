import SessionsList from './components/SessionsList';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-blue-100">EVGraph</h1>
          <p className="text-slate-400 mt-2">EV Betting Analytics Dashboard</p>
        </header>

        <main>
          <SessionsList />
        </main>
      </div>
    </div>
  );
}

export default App;