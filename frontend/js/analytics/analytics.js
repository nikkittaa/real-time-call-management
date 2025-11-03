import { checkAuth } from '../dashboard/utils.js';


const fromDate = document.getElementById('fromDate');
const toDate = document.getElementById('toDate');
const phone = document.getElementById('phoneNumber');
const status = document.getElementById('status');
const applyBtn = document.getElementById('applyFilters');
const clearBtn = document.getElementById('clearFilters');

export async function loadAnalytics() {
    const token = localStorage.getItem('token');

    await checkAuth();
    

    const params = new URLSearchParams({});

    if (fromDate.value) {
      params.append('from', new Date(fromDate.value).toISOString());
    }
    if (toDate.value) {
      params.append('to', new Date(toDate.value).toISOString());
    }

    if (phone.value) {
      params.append('phone', phone.value.trim());
    }

    if (status.value) {
      params.append('status', status.value);
    }



    const res = await fetch(`http://localhost:3002/calls/analytics?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

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

    
    if(window.statusChartInstance) {
      window.statusChartInstance.destroy();
    }
    const ctx = document.getElementById('statusChart').getContext('2d');
    window.statusChartInstance = new Chart(ctx, {
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

applyBtn.addEventListener('click', () => {
  loadAnalytics();
});

  clearBtn.addEventListener('click', () => {
    fromDate.value = '';
    toDate.value = '';
    phone.value = '';
    status.value = '';
    loadAnalytics();
  });
  
  loadAnalytics();