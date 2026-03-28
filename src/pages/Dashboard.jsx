import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import StatCard from '../components/StatCard';
import { FileText, Users, Clock, Star, Package, MessageSquare, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CAT_COLORS = [
  '#4A90E2','#E94B3C','#50C878','#FFB800','#9B59B6',
  '#1ABC9C','#E67E22','#E91E63','#FF5722','#607D8B',
  '#795548','#009688','#673AB7','#F06292','#26C6DA'
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalReports: 0,
    citizensRegistered: 0,
    pendingRequests: 0,
    feedbackSummary: 0
  });
  const [reportsByCategory, setReportsByCategory] = useState([]);
  const [feedbackByRating, setFeedbackByRating] = useState([]);
  const [lostFoundItems, setLostFoundItems] = useState([]);
  const [borrowedSupplies, setBorrowedSupplies] = useState([]);
  const [recentRatings, setRecentRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allReportsRaw, setAllReportsRaw] = useState([]);
  const [reportFilterYear, setReportFilterYear] = useState(new Date().getFullYear());
  const [reportFilterCategory, setReportFilterCategory] = useState('All');
  const [reportFilterMonthStart, setReportFilterMonthStart] = useState(1);
  const [reportFilterMonthEnd, setReportFilterMonthEnd] = useState(12);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Refresh auth token
      const currentUser = auth.currentUser;
      if (currentUser) await currentUser.getIdToken(true);
      
      console.log('🔄 Dashboard: Starting to fetch data...');
      
      // Fetch total reports from mobile app (sorted by newest first)
      const reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const reportsSnapshot = await getDocs(reportsQuery);
      const totalReports = reportsSnapshot.size;
      const rawReports = reportsSnapshot.docs.map(d => ({
        id: d.id,
        category: d.data().category || 'Unknown',
        source: 'Report',
        createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate()
          : d.data().createdAt?.seconds ? new Date(d.data().createdAt.seconds * 1000) : null
      }));
      console.log('📊 Dashboard: Total reports:', totalReports);
      console.log('📊 Dashboard: Reports docs:', reportsSnapshot.docs.map(d => ({id: d.id, ...d.data()})));

      // Fetch users count from mobile app registrations
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const citizensRegistered = usersSnapshot.size;
      console.log('👥 Dashboard: Citizens registered:', citizensRegistered);

      // Count pending approval users
      const pendingUsers = usersSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.approvalStatus === 'pending' || data.isPending === true;
      }).length;
      console.log('⏰ Dashboard: Pending users:', pendingUsers);

      // Fetch service requests for feedback
      const serviceRequestsQuery = query(collection(db, 'service_requests'), orderBy('createdAt', 'desc'));
      const serviceRequestsSnapshot = await getDocs(serviceRequestsQuery);
      console.log('📊 Dashboard: Total service requests:', serviceRequestsSnapshot.size);

      // Calculate average feedback from BOTH reports and service requests
      const reportFeedback = reportsSnapshot.docs.filter(doc => {
        const rating = doc.data().rating;
        return rating && rating >= 1 && rating <= 5;
      });
      
      const serviceFeedback = serviceRequestsSnapshot.docs.filter(doc => {
        const rating = doc.data().rating;
        return rating && rating >= 1 && rating <= 5;
      });
      
      console.log('⭐ Dashboard: Report feedback items:', reportFeedback.length);
      console.log('⭐ Dashboard: Service feedback items:', serviceFeedback.length);
      
      let totalRating = 0;
      let ratingCount = 0;
      const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      
      // Process report feedback
      reportFeedback.forEach((doc) => {
        const rating = doc.data().rating;
        totalRating += rating;
        ratingCount++;
        ratingBreakdown[rating]++;
      });
      
      // Process service request feedback
      serviceFeedback.forEach((doc) => {
        const rating = doc.data().rating;
        totalRating += rating;
        ratingCount++;
        ratingBreakdown[rating]++;
      });

      // Fetch lost_items with ratings
      const lostQuery2 = query(collection(db, 'lost_items'), orderBy('createdAt', 'desc'));
      const lostSnapshot2 = await getDocs(lostQuery2);
      const lostFeedback = lostSnapshot2.docs.filter(doc => {
        const rating = doc.data().rating;
        return rating && rating >= 1 && rating <= 5;
      });
      lostFeedback.forEach((doc) => {
        const rating = doc.data().rating;
        totalRating += rating;
        ratingCount++;
        ratingBreakdown[rating]++;
      });

      // Build recent ratings list (latest 5 across all sources)
      const allRatings = [
        ...reportFeedback.map(d => ({
          id: d.id,
          userName: d.data().userName || d.data().reporterName || 'Anonymous',
          rating: d.data().rating,
          comment: d.data().feedbackComment || d.data().resolutionFeedback || '',
          type: 'Report',
          ratedAt: d.data().ratedAt?.toDate ? d.data().ratedAt.toDate()
            : d.data().updatedAt?.toDate ? d.data().updatedAt.toDate()
            : d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(0)
        })),
        ...serviceFeedback.map(d => ({
          id: d.id,
          userName: d.data().requestedBy || d.data().userName || 'Anonymous',
          rating: d.data().rating,
          comment: d.data().feedbackComment || d.data().resolutionFeedback || '',
          type: 'Service',
          ratedAt: d.data().ratedAt?.toDate ? d.data().ratedAt.toDate()
            : d.data().updatedAt?.toDate ? d.data().updatedAt.toDate()
            : d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(0)
        })),
        ...lostFeedback.map(d => ({
          id: d.id,
          userName: d.data().reporterName || d.data().userName || 'Anonymous',
          rating: d.data().rating,
          comment: d.data().ratingComment || d.data().feedbackComment || '',
          type: 'Lost & Found',
          itemName: d.data().itemName || 'Lost Item',
          ratedAt: d.data().ratedAt?.toDate ? d.data().ratedAt.toDate()
            : d.data().updatedAt?.toDate ? d.data().updatedAt.toDate()
            : d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(0)
        }))
      ].sort((a, b) => b.ratedAt - a.ratedAt).slice(0, 5);

      setRecentRatings(allRatings);
      
      const feedbackSummary = ratingCount > 0 ? totalRating / ratingCount : 0;
      console.log('⭐ Dashboard: Total feedback items:', ratingCount);
      console.log('⭐ Dashboard: Average rating:', feedbackSummary);
      
      // Create chart data for feedback ratings
      const feedbackChartData = [
        { rating: '5 ⭐', count: ratingBreakdown[5], stars: 5 },
        { rating: '4 ⭐', count: ratingBreakdown[4], stars: 4 },
        { rating: '3 ⭐', count: ratingBreakdown[3], stars: 3 },
        { rating: '2 ⭐', count: ratingBreakdown[2], stars: 2 },
        { rating: '1 ⭐', count: ratingBreakdown[1], stars: 1 }
      ];

      // Count reports by category
      const categoryCount = {};
      reportsSnapshot.forEach((doc) => {
        const category = doc.data().category || 'Unknown';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });

      const chartData = Object.entries(categoryCount).map(([category, count]) => ({
        category,
        count
      }));
      
      console.log('📈 Dashboard: Reports by category:', chartData);

      // Fetch lost & found items (sorted by newest first)
      const lostFoundQuery = query(collection(db, 'lost_items'), orderBy('createdAt', 'desc'));
      const lostFoundSnapshot = await getDocs(lostFoundQuery);
      console.log('🔍 Dashboard: Lost items found:', lostFoundSnapshot.size);
      
      const lostFoundData = lostFoundSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).slice(0, 5); // Get latest 5 items

      // Fetch borrowed supplies with user details
      const borrowedSnapshot = await getDocs(collection(db, 'borrowed_supplies'));
      console.log('📦 Dashboard: Borrowed items found:', borrowedSnapshot.size);
      
      const borrowedPromises = borrowedSnapshot.docs.slice(0, 5).map(async (borrowDoc) => {
        const borrowData = borrowDoc.data();
        
        // Fetch supply name and image
        let supplyName = borrowData.itemName || borrowData.supplyName || 'Unknown Item';
        let supplyImage = borrowData.imageUrl || borrowData.supplyImage || '';
        
        if (borrowData.supplyId) {
          try {
            const supplyDoc = await getDoc(doc(db, 'supplies', borrowData.supplyId));
            if (supplyDoc.exists()) {
              const supplyData = supplyDoc.data();
              supplyName = supplyData.itemName || supplyName;
              supplyImage = supplyData.imageUrl || supplyImage;
            }
          } catch (err) {
            console.error('Error fetching supply:', err);
          }
        }
        
        let borrowerName = 'Unknown User';
        let borrowerZone = 'N/A';
        
        // Fetch user details - check multiple field names
        const borrowerId = borrowData.userId || borrowData.borrowerId || borrowData.borrower;
        
        if (borrowerId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', borrowerId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              borrowerName = 
                userData.displayName || 
                userData.name ||
                (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}`.trim() : null) ||
                userData.firstName || 
                userData.email || 
                'Unknown User';
              
              // Fetch zone information
              borrowerZone = userData.zone || userData.barangayZone || userData.address || borrowData.zone || 'N/A';
            }
          } catch (err) {
            console.error('Error fetching user:', err);
          }
        }
        
        return {
          id: borrowDoc.id,
          ...borrowData,
          supplyName,
          supplyImage,
          borrowerName,
          borrowerZone
        };
      });
      
      const borrowedData = await Promise.all(borrowedPromises);
      console.log('📦 Dashboard: Borrowed items with user names:', borrowedData);

      console.log('✅ Dashboard: Setting all stats...');
      setStats({
        totalReports,
        citizensRegistered,
        pendingRequests: pendingUsers,
        feedbackSummary
      });
      const rawServiceRequests = serviceRequestsSnapshot.docs.map(d => ({
        id: d.id,
        category: 'Service: ' + (d.data().serviceType || d.data().type || d.data().category || d.data().requestType || 'Service Request'),
        source: 'Service Request',
        createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate()
          : d.data().createdAt?.seconds ? new Date(d.data().createdAt.seconds * 1000) : null
      }));
      setAllReportsRaw([...rawReports, ...rawServiceRequests]);
      setReportsByCategory(chartData);
      setFeedbackByRating(feedbackChartData);
      setLostFoundItems(lostFoundData);
      setBorrowedSupplies(borrowedData);
      setLoading(false);
      
      console.log('✅ Dashboard: Data fetch complete!');
      
    } catch (error) {
      console.error('❌ Dashboard: Error fetching dashboard data:', error);
      console.error('❌ Dashboard: Error details:', error.message, error.code);
      setLoading(false);
    }
  };

  const availableYears = useMemo(() => {
    const years = [...new Set(allReportsRaw.filter(r => r.createdAt).map(r => r.createdAt.getFullYear()))];
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) years.push(currentYear);
    return years.sort((a, b) => b - a);
  }, [allReportsRaw]);

  const availableCategories = useMemo(() => {
    const cats = [...new Set(allReportsRaw.map(r => r.category))];
    return ['All', ...cats.sort()];
  }, [allReportsRaw]);

  const categoryColorMap = useMemo(() => {
    const cats = availableCategories.filter(c => c !== 'All');
    return Object.fromEntries(cats.map((c, i) => [c, CAT_COLORS[i % CAT_COLORS.length]]));
  }, [availableCategories]);

  const monthlyChartData = useMemo(() => {
    const cats = availableCategories.filter(c => c !== 'All');
    return MONTHS.map((month, idx) => {
      const monthNum = idx + 1;
      if (monthNum < reportFilterMonthStart || monthNum > reportFilterMonthEnd) return null;
      const inMonth = allReportsRaw.filter(r => {
        if (!r.createdAt) return false;
        if (r.createdAt.getFullYear() !== reportFilterYear) return false;
        if (r.createdAt.getMonth() !== idx) return false;
        return true;
      });
      if (reportFilterCategory !== 'All') {
        return { month, count: inMonth.filter(r => r.category === reportFilterCategory).length };
      }
      const entry = { month };
      cats.forEach(cat => { entry[cat] = inMonth.filter(r => r.category === cat).length; });
      return entry;
    }).filter(Boolean);
  }, [allReportsRaw, reportFilterYear, reportFilterCategory, reportFilterMonthStart, reportFilterMonthEnd, availableCategories]);

  const monthlyTotal = useMemo(() => {
    if (reportFilterCategory !== 'All') return monthlyChartData.reduce((s, d) => s + (d.count || 0), 0);
    return monthlyChartData.reduce((s, d) =>
      s + Object.entries(d).filter(([k]) => k !== 'month').reduce((a, [, v]) => a + v, 0), 0);
  }, [monthlyChartData, reportFilterCategory]);

  const monthlyPeak = useMemo(() => {
    if (monthlyChartData.length === 0) return '—';
    if (reportFilterCategory !== 'All') {
      const mx = monthlyChartData.reduce((a, b) => (b.count > a.count ? b : a));
      return mx.count > 0 ? mx.month : '—';
    }
    const withTotals = monthlyChartData.map(d => ({
      month: d.month,
      total: Object.entries(d).filter(([k]) => k !== 'month').reduce((a, [, v]) => a + v, 0)
    }));
    const mx = withTotals.reduce((a, b) => (b.total > a.total ? b : a));
    return mx.total > 0 ? mx.month : '—';
  }, [monthlyChartData, reportFilterCategory]);

  const printMonthlyReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const categoryLabel = reportFilterCategory === 'All' ? 'All Categories' : reportFilterCategory;
    const monthLabel = reportFilterMonthStart === 1 && reportFilterMonthEnd === 12
      ? 'Full Year'
      : MONTH_NAMES[reportFilterMonthStart - 1] + ' \u2013 ' + MONTH_NAMES[reportFilterMonthEnd - 1];
    const cats = availableCategories.filter(c => c !== 'All');
    let tableHead, tableRows;
    if (reportFilterCategory !== 'All') {
      const maxCount = Math.max(...monthlyChartData.map(d => d.count || 0), 1);
      tableHead = '<tr><th>Month</th><th>' + reportFilterCategory + '</th><th>Bar</th></tr>';
      tableRows = monthlyChartData.map(d =>
        '<tr><td style="padding:8px 16px;border:1px solid #e5e7eb;">' + d.month + '</td>' +
        '<td style="padding:8px 16px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;">' + (d.count || 0) + '</td>' +
        '<td style="padding:8px 16px;border:1px solid #e5e7eb;"><div style="height:16px;background:#4A90E2;border-radius:3px;width:' +
        Math.round(((d.count || 0) / maxCount) * 200) + 'px;min-width:' + ((d.count || 0) > 0 ? 4 : 0) + 'px;"></div></td></tr>'
      ).join('');
    } else {
      tableHead = '<tr><th>Month</th>' + cats.map(c => '<th>' + c + '</th>').join('') + '<th>Total</th></tr>';
      tableRows = monthlyChartData.map(d => {
        const rowTotal = cats.reduce((s, c) => s + (d[c] || 0), 0);
        return '<tr>' +
          '<td style="padding:8px 16px;border:1px solid #e5e7eb;">' + d.month + '</td>' +
          cats.map(c => '<td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">' + (d[c] || 0) + '</td>').join('') +
          '<td style="padding:8px 16px;border:1px solid #e5e7eb;text-align:center;font-weight:bold;">' + rowTotal + '</td>' +
          '</tr>';
      }).join('');
    }
    const html =
      '<!DOCTYPE html><html><head><title>Monthly Reports \u2013 ' + reportFilterYear + '</title>' +
      '<meta charset="UTF-8"><style>' +
      'body{font-family:Arial,sans-serif;padding:32px;color:#1f2937;}' +
      'h1{font-size:22px;margin-bottom:4px;}' +
      '.subtitle{color:#6b7280;font-size:14px;margin-bottom:24px;}' +
      'table{width:100%;border-collapse:collapse;margin-top:8px;}' +
      'th{background:#4A90E2;color:white;padding:10px 12px;text-align:left;font-size:13px;}' +
      'tr:nth-child(even){background:#f9fafb;}' +
      '.total{margin-top:20px;font-weight:bold;font-size:16px;}' +
      '@media print{body{padding:16px;}}' +
      '</style></head><body>' +
      '<h1>Monthly Reports \u2013 ' + reportFilterYear + '</h1>' +
      '<p class="subtitle">Category: ' + categoryLabel + ' &nbsp;|&nbsp; Period: ' + monthLabel + '</p>' +
      '<table><thead>' + tableHead + '</thead><tbody>' + tableRows + '</tbody></table>' +
      '<p class="total">Total: ' + monthlyTotal + ' report' + (monthlyTotal !== 1 ? 's' : '') + '</p>' +
      '</body></html>';
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard
          title="Total Reports"
          value={stats.totalReports}
          icon={FileText}
          bgColor="bg-[#4A90E2]"
          iconColor="text-white"
        />
        <StatCard
          title="Citizens Registered"
          value={stats.citizensRegistered}
          icon={Users}
          bgColor="bg-[#50C878]"
          iconColor="text-white"
        />
        <StatCard
          title="Pending Approval"
          value={stats.pendingRequests}
          icon={Clock}
          bgColor="bg-[#E94B3C]"
          iconColor="text-white"
        />
        <StatCard
          title="Feedback Summary"
          value={stats.feedbackSummary.toFixed(1)}
          icon={Star}
          bgColor="bg-[#4A90E2]"
          iconColor="text-white"
        />
      </div>

      {/* Monthly Reports Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-base font-semibold text-gray-800">Monthly Reports</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={reportFilterYear}
              onChange={e => setReportFilterYear(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={reportFilterCategory}
              onChange={e => setReportFilterCategory(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {availableCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={reportFilterMonthStart}
              onChange={e => {
                const val = Number(e.target.value);
                setReportFilterMonthStart(val);
                if (val > reportFilterMonthEnd) setReportFilterMonthEnd(val);
              }}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">to</span>
            <select
              value={reportFilterMonthEnd}
              onChange={e => {
                const val = Number(e.target.value);
                setReportFilterMonthEnd(val);
                if (val < reportFilterMonthStart) setReportFilterMonthStart(val);
              }}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <button
              onClick={printMonthlyReport}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded transition-colors"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg px-4 py-2">
            <p className="text-xs text-blue-600 font-medium">Total in Period</p>
            <p className="text-2xl font-bold text-blue-700">
              {monthlyTotal}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg px-4 py-2">
            <p className="text-xs text-blue-600 font-medium">Peak Month</p>
            <p className="text-2xl font-bold text-blue-700">{monthlyPeak}</p>
          </div>
          <div className="bg-blue-50 rounded-lg px-4 py-2">
            <p className="text-xs text-blue-600 font-medium">Category Filter</p>
            <p className="text-sm font-bold text-blue-700 mt-1">{reportFilterCategory}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
            <Legend />
            {reportFilterCategory !== 'All' ? (
              <Bar dataKey="count" fill="#4A90E2" radius={[4, 4, 0, 0]} name={reportFilterCategory} />
            ) : (
              availableCategories.filter(c => c !== 'All').map(cat => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={categoryColorMap[cat]} name={cat} />
              ))
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Reports by Category Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Reports by category</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={reportsByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" />
              <YAxis dataKey="category" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#E94B3C" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Placeholder Box 1 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-gray-800">Recent Lost & Found</h3>
            <a href="/lost-found" className="text-blue-500 text-sm hover:underline">View More &gt;</a>
          </div>
          <div className="space-y-3">
            {lostFoundItems.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No items yet</p>
            ) : (
              lostFoundItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-800">{item.itemName || 'N/A'}</p>
                    <p className="text-xs text-gray-500 truncate">{item.description || 'No description'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ml-2 ${
                    item.status === 'found' ? 'bg-green-100 text-green-700' :
                    item.status === 'claimed' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.status || 'Lost'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* Feedback Ratings Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-gray-800">Feedback Ratings</h2>
            <a href="/feedback" className="text-blue-500 text-sm hover:underline">View All &gt;</a>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={feedbackByRating}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="rating" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#FFB800" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-800">{stats.feedbackSummary.toFixed(1)} ⭐</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Feedback</p>
                <p className="text-2xl font-bold text-gray-800">
                  {feedbackByRating.reduce((sum, item) => sum + item.count, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Ratings */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-gray-800">Recent Ratings</h3>
            <button
              onClick={() => navigate('/feedback')}
              className="text-blue-500 text-sm hover:underline"
            >
              View All &gt;
            </button>
          </div>
          <div className="space-y-3">
            {recentRatings.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No ratings yet</p>
            ) : (
              recentRatings.map((r, i) => (
                <div key={`${r.id}-${i}`} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: r.type === 'Lost & Found' ? '#FEF3C7' :
                                  r.type === 'Service' ? '#DBEAFE' : '#F3E8FF'
                    }}>
                    <span className="font-bold text-sm"
                      style={{
                        color: r.type === 'Lost & Found' ? '#B45309' :
                               r.type === 'Service' ? '#1D4ED8' : '#7C3AED'
                      }}>
                      {(r.userName || 'A').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-gray-800 truncate">{r.userName}</p>
                      <div className="flex gap-0.5 ml-2">
                        {Array(5).fill(0).map((_, si) => (
                          <Star key={si} size={12}
                            className={si < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {r.comment || (r.type === 'Lost & Found' ? r.itemName : 'No comment')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        r.type === 'Lost & Found' ? 'bg-amber-100 text-amber-700' :
                        r.type === 'Service' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {r.type === 'Lost & Found' ? '🔍 L&F' : r.type === 'Service' ? '🛎️ Service' : '📋 Report'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {r.ratedAt instanceof Date && !isNaN(r.ratedAt) ? r.ratedAt.toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {recentRatings.length > 0 && (
            <div className="mt-4 pt-3 border-t flex items-center gap-2 text-sm text-gray-500">
              <MessageSquare size={14} />
              <span>{feedbackByRating.reduce((s, i) => s + i.count, 0)} total ratings across all features</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Borrowed Supplies */}
      <div className="mt-5">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-gray-800">Recent Borrowed Supplies</h3>
            <a href="/supplies" className="text-blue-500 text-sm hover:underline">View More &gt;</a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {borrowedSupplies.length === 0 ? (
              <p className="text-center text-gray-400 py-8 col-span-3">No borrowed items yet</p>
            ) : (
              borrowedSupplies.map((item) => {
                const supplyImage = item.supplyImage || item.imageUrl;
                const supplyName = item.supplyName || item.itemName || 'N/A';
                const borrowedDate = item.borrowedAt?.toDate ? item.borrowedAt.toDate() : 
                                   item.borrowedAt?.seconds ? new Date(item.borrowedAt.seconds * 1000) : 
                                   item.borrowedDate?.seconds ? new Date(item.borrowedDate.seconds * 1000) : null;
                
                return (
                  <div key={item.id} className="flex items-start gap-3 py-3 border-b last:border-0">
                    {supplyImage ? (
                      <img src={supplyImage} alt={supplyName} className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <Package size={20} className="text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{supplyName}</p>
                      <p className="text-sm text-blue-600 font-medium">{item.borrowerName}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity || 1} • {borrowedDate ? borrowedDate.toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                      item.status === 'returned' ? 'bg-green-100 text-green-700' :
                      item.status === 'borrowed' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {item.status || 'Borrowed'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
