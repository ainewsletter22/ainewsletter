import { useState, useEffect } from "react";
import DashboardHeader from "../../components/Dashboardheader";
import { clientService } from "../../store/clientService";
import { useNavigate } from "react-router";

interface Job {
  id: string;
  job_id: string;
  prompt: string;
  status: string;
  created_at: string;
}

export default function SearchHistory() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await clientService.getAllJobs();
        // The backend typically wraps the array in a data property
        const data = response.data || [];
        setJobs(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch search history", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "complete": return "bg-green-100 text-green-700";
      case "failed": return "bg-red-100 text-red-700";
      case "processing": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader />
      
      <main className="flex-1 px-4 md:px-6 py-6 max-w-7xl w-full mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI Search History</h1>
          <p className="text-gray-500 text-sm">View and manage your previous lead generation requests</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-400">Loading history...</div>
          ) : jobs.length === 0 ? (
            <div className="py-20 text-center text-gray-400">No previous searches found.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Search Prompt</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      <div className="max-w-md truncate" title={job.prompt}>
                        {job.prompt}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {job.status === "complete" ? (
                        <button 
                          onClick={() => {
                            // We can pass the jobId to FindClients to trigger a result fetch
                            navigate("/find-clients", { state: { resumeJobId: job.job_id } });
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-bold"
                        >
                          View Results
                        </button>
                      ) : (
                        <span className="text-gray-300 text-sm italic">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}