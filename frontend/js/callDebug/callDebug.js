import { checkAuth } from '../dashboard/utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const callSid = new URLSearchParams(window.location.search).get('callSid');
  await checkAuth();
  const token = localStorage.getItem('token');
  const res = await fetch(`http://localhost:3002/calls/summary?callSid=${callSid}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  let data;
  try{
    data = await res.json();
  }catch(error){
    alert('No data found');
    window.location.href = '/call_logs.html';
    return;
  }


  const recordings = JSON.parse(data.recordings);
  const events = data.events;
  
  const childCalls = JSON.parse(data.child_calls);

  document.getElementById('callSid').innerText = callSid;
  document.getElementById('from').innerText = data.from;
  document.getElementById('to').innerText = data.to;
  document.getElementById('date').innerText = data.date_created + " UTC";
  document.getElementById('startTime').innerText = data.start_time + " UTC";
  document.getElementById('endTime').innerText = data.end_time + " UTC";
  document.getElementById('direction').innerText = data.direction;
  document.getElementById('duration').innerText = data.duration + ' seconds';
  document.getElementById('status').innerText = data.status;
  document.getElementById('price').innerText = data.price;
  document.getElementById('priceUnit').innerText = data.price_unit;

  if(childCalls.length > 0) {
    document.getElementById('child-calls').innerHTML = '<h2>Child Calls</h2>';
    for(const childCall of childCalls) {
      const element = document.createElement('a');
      element.href = `/callDebug.html?callSid=${childCall.sid}`;
      element.target = '_blank';
      element.innerHTML = `${childCall.sid}`;
      document.getElementById('child-calls').appendChild(element);
    }
  }
  if(recordings.length > 0) {
    const element = document.createElement('a');
    element.href = `https:/api.twilio.com/${recordings[0].uri.replace('.json','')}`;
    element.innerHTML = 'View Recording';
    document.getElementById('recordings').innerHTML = element.outerHTML;
  }
  
  if(events.length > 0) {
    for (const event of events) {
        const eventItem = document.createElement("div");
        eventItem.classList.add("event-item");
    
        const header = document.createElement("p");
        header.classList.add("event-header");
        header.innerHTML = `<span>${event.url} - <span class = "status">${event.response_code} - ${event.timestamp}</span></span>`;
        const details = document.createElement("div");
        details.classList.add("event-details");
        details.innerHTML = `<strong class = "event-subheading">Request</strong><br>`;
              
        for(const [key, value] of Object.entries(JSON.parse(event.request))) {
          details.innerHTML += `<strong>${key}:</strong> ${escapeHtml(JSON.stringify(value))}<br>`;
         
          if(data.to === '' && key === 'to'){
            document.getElementById('to').innerText = value;
          }
          if(key === 'parent_call_sid' && !document.getElementById('parent-call-sid')){   
              const parentElement = document.createElement('p');
              parentElement.setAttribute('id', 'parent-call-sid');
            
            parentElement.setAttribute('id', 'parent-call-sid');
            const element = document.createElement('a');
            element.href = `/callDebug.html?callSid=${value}`;
            element.target = '_blank';
            element.innerHTML = `${value}`;
            parentElement.innerHTML = `<p><strong>Parent Call:</strong> ${element.outerHTML}</p>`;
            document.querySelector('.left-column').appendChild(parentElement);
          }
        }
        
       
       details.innerHTML += `<br>`;
      
       if (event.response) {
        details.innerHTML += `<strong class = "event-subheading">Response</strong>
            <pre class="response-body">"${(formatAndColorXml(event.response))}"</pre>
        `;

      }
       details.innerHTML += `<br>`;
        header.addEventListener("click", () => {
          const isVisible = details.style.display === "block";
          details.style.display = isVisible ? "none" : "block";
        });
    
        eventItem.appendChild(header);
        eventItem.appendChild(details);
        document.getElementById('events').appendChild(eventItem);
      }
  }
  else {
    document.getElementById('events').innerHTML = 'No events found';
  }

});

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


function formatAndColorXml(escapedXml) {
  try {
    let rawXml = JSON.parse(escapedXml);

    // 1. Line Break Formatting
    // Insert newline between a closing bracket and the start of the next tag.
    let formattedXml = rawXml.replace(/(>)(<)/g, '$1\n$2');

    // 2. Add Spans for Highlighting
    // These replacements must happen BEFORE final HTML escaping.

    // A. Match attribute name="value" and wrap in spans
    formattedXml = formattedXml.replace(
      /(\w+)(=)(".*?")/g,
      '<span class="xml-attr-name">$1</span><span class="xml-equals">$2</span><span class="xml-attr-value">$3</span>'
    );
    
    // B. Match tag names (e.g., Response, Dial, Number)
    // We look for tags that DON'T have a space after the < to exclude the XML declaration
    formattedXml = formattedXml.replace(
      /<(\/?)([a-zA-Z0-9]+)/g,
      '<span class="xml-bracket">&lt;</span>$1<span class="xml-tag-name">$2</span>'
    );
    // C. Handle the closing > for tags
    formattedXml = formattedXml.replace(
      />/g,
      '<span class="xml-bracket">&gt;</span>'
    );
    
    // D. Handle the XML declaration <?xml ... ?> separately
    formattedXml = formattedXml.replace(
      /<\?xml(.*)\?>/g,
      '<span class="xml-comment-or-declaration">&lt;?xml$1?&gt;</span>'
    );

    // 3. Final Escaping of Remaining < and > for safe HTML display (Crucial Step!)
    // The previous steps injected the span tags. Now we must ensure the XML brackets are text.
    
    // Let's refine the tag replacement to be cleaner by only replacing what's left:
    
    // We need to re-encode the HTML entities for the brackets we introduced in step 2
    // The previous regex replacement was not fully correct. Let's simplify and rely on final escaping.
    
    // Resetting and simplifying the whole process for reliable output:
    rawXml = JSON.parse(escapedXml);
    let finalOutput = rawXml.replace(/(>)(<)/g, '$1\n$2');
    
    // Now, apply the styling to the parts of the XML string
    
    // Escape the XML brackets first for safe handling
    finalOutput = finalOutput
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // 4. Inject Span Tags into the Escaped String
    
    // Match <span class="xml-tag-name"> (for the tag names themselves)
    finalOutput = finalOutput.replace(
      /(&lt;)(\/?)(\w+)/g,
      '<span class="xml-bracket">&lt;</span>$2<span class="xml-tag-name">$3</span>'
    );

    // Match attribute name="value"
    

    // Match closing tag bracket
    finalOutput = finalOutput.replace(
        /(&gt;)/g,
        '<span class="xml-bracket">&gt;</span>'
    );
    
    // Match the XML declaration
    finalOutput = finalOutput.replace(
        /(&lt;\?xml.*?&gt;)/g,
        '<span class="xml-comment-or-declaration">$1</span>'
    );


    return finalOutput.trim();

  } catch (e) {
    console.error("Error processing XML string:", e);
    return "Error parsing XML string: " + e.message;
  }
}