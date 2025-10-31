export async function loadAnalytics() {
    const token = localStorage.getItem('token');
    const res = await fetch('http://localhost:3002/calls/analytics', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if(res.status === 401) {
      alert('Session expired or invalid. Please login again.');
      window.location.href = '/';
      return;
    }
    if(res.status !== 200) {
      alert('Error fetching analytics');
      return;
    }
    const data = await res.json();
  
    document.getElementById('totalCalls').innerText = data.total_calls;
    document.getElementById('avgDuration').innerText = data.avg_duration + ' sec';
    document.getElementById('successRate').innerText = data.success_rate + '%';
  

    const statusColors = {
        'completed': '#4CAF50', // green
        'no-answer': '#FF9800', // orange
        'failed': '#F44336',    // red
        'busy': '#2196F3',      // blue
        'canceled': '#9E9E9E'   // gray
      };
      
    const ctx = document.getElementById('statusChart').getContext('2d');
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: data.status_distribution.map(s => s.status),
        datasets: [{
          data: data.status_distribution.map(s => s.count), 
          backgroundColor: data.status_distribution.map(s => statusColors[s.status] || '#CCCCCC')
        }]
      }
    });
  }
  
  loadAnalytics();