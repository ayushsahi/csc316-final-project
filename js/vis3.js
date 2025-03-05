// Enhanced vis3.js file with province filtering and improved zooming
(async function() {
  // 1) Load CSV - use the filtered data
  const data = await d3.csv("data/food_cpi_data.csv");
  
  // 2) Parse date & numeric value
  const parseDate = d3.timeParse("%Y-%m-%d");
  data.forEach(d => {
    // Handle different possible date formats (adjust as needed)
    d.date = parseDate(d["REF_DATE"]) || d3.timeParse("%Y-%m")(d["REF_DATE"]);
    d.value = +d["VALUE"];
  });
  
  // Create UI controls for province selection
  const provinces = [...new Set(data.map(d => d["GEO"]))].sort();
  
  const controlPanel = d3.select("#vis3")
    .append("div")
    .attr("class", "control-panel")
    .style("margin-bottom", "20px");
  
  // Add province selector
  const provinceSelector = controlPanel.append("div")
    .style("margin-bottom", "10px");
  
  provinceSelector.append("label")
    .text("Select Province: ")
    .attr("for", "province-select");
  
  const provinceSelect = provinceSelector.append("select")
    .attr("id", "province-select");
  
  // Add options for each province
  provinceSelect.selectAll("option")
    .data(provinces)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);
  
  // Add filter button
  controlPanel.append("button")
    .attr("id", "filter-button")
    .text("Apply Filter")
    .style("margin-right", "10px")
    .style("padding", "5px 10px");
  
  // Add reset zoom button
  controlPanel.append("button")
    .attr("id", "reset-zoom")
    .text("Reset Zoom")
    .style("padding", "5px 10px");
  
  // 3) Chart dimensions
  const margin = { top: 30, right: 120, bottom: 50, left: 80 },
        width = 800 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;
  
  // Create SVG container
  const svg = d3.select("#vis3")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Function to update visualization based on selected province
  function updateVisualization() {
    // Clear existing elements
    svg.selectAll("*").remove();
    
    // Get selected province
    const selectedProvince = d3.select("#province-select").property("value");
    
    // Filter data for selected province
    const filteredData = data.filter(d => d["GEO"] === selectedProvince && d.date);
    
    // Group data by product group
    const nested = d3.groups(filteredData, d => d["Products and product groups"]);
    
    // Sort each sub-array by date
    nested.forEach(group => {
      group[1].sort((a, b) => a.date - b.date);
    });
    
    // Define scales
    const allDates = nested.flatMap(([, vals]) => vals).map(d => d.date);
    const x = d3.scaleTime()
      .domain(d3.extent(allDates))
      .range([0, width]);
    
    const allValues = nested.flatMap(([, vals]) => vals).map(d => d.value);
    const y = d3.scaleLinear()
      .domain([0, d3.max(allValues) * 1.05])
      .range([height, 0])
      .nice();
    
    // Create axes
    const xAxis = svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).ticks(10));
    
    const yAxis = svg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y));
    
    // Add axis labels
    svg.append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .text("Year");
    
    svg.append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -60)
      .text("Consumer Price Index (2002=100)");
    
    // Line generator
    const lineGen = d3.line()
      .defined(d => !isNaN(d.value))
      .x(d => x(d.date))
      .y(d => y(d.value));
    
    // Color scale (one color per product group)
    const colorPalette = d3.schemeCategory10.concat(d3.schemeSet2);
    const color = d3.scaleOrdinal(colorPalette)
      .domain(nested.map(d => d[0]));
    
    // Draw lines
    const lines = svg.selectAll(".line-group")
      .data(nested)
      .join("path")
      .attr("class", "line-group")
      .attr("fill", "none")
      .attr("stroke", d => color(d[0]))
      .attr("stroke-width", d => d[0] === "All-items" ? 3 : 1.5)
      .attr("d", d => lineGen(d[1]));
    
    // Add a legend
    const legend = svg.selectAll(".legend")
      .data(nested.map(d => d[0]))
      .join("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(${width + 10}, ${i * 20})`);
    
    legend.append("rect")
      .attr("x", 0)
      .attr("y", -8)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", d => color(d));
    
    legend.append("text")
      .attr("x", 15)
      .attr("y", 0)
      .attr("dy", ".35em")
      .text(d => d);
    
    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .text(`Food CPI Over Time for ${selectedProvince}`);
      
    // Zoom functionality
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .extent([[0, 0], [width, height]])
      .on("zoom", zoomed);
      
    function zoomed(event) {
      // Create new scale based on zoom event
      const newX = event.transform.rescaleX(x);
      
      // Update x-axis
      xAxis.call(d3.axisBottom(newX).ticks(10));
      
      // Update lines
      lines.attr("d", function(d) {
        return d3.line()
          .defined(d => !isNaN(d.value))
          .x(d => newX(d.date))
          .y(d => y(d.value))
          (d[1]);
      });
      
      // Update the focus line and circles if they exist
      if (focusLine) {
        focusLine.style("display", "none"); // Hide during zoom
      }
    }
    
    // Add invisible rectangle for zoom
    const zoomRect = svg.append("rect")
      .attr("class", "zoom-rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .call(zoom);
      
    // Create vertical line for hover tracking
    const focusLine = svg.append("line")
      .attr("class", "focus-line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#999")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .style("opacity", 0);
    
    // Create tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "rgba(255, 255, 255, 0.9)")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "10px")
      .style("box-shadow", "0 0 10px rgba(0,0,0,0.1)")
      .style("pointer-events", "none")
      .style("opacity", 0);
    
    // Create focus circles for data points
    const focusCircles = svg.append("g")
      .attr("class", "focus-circles")
      .style("opacity", 0);
    
    // Add circles for each product group
    nested.forEach(([groupName, data]) => {
      focusCircles.append("circle")
        .attr("class", `circle-${groupName.replace(/\s+/g, '-').toLowerCase()}`)
        .attr("r", 5)
        .attr("fill", color(groupName))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);
    });
    
    // Add overlay for mouse tracking
    svg.append("rect")
      .attr("class", "overlay")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", () => {
        focusLine.style("opacity", 1);
        tooltip.style("opacity", 1);
        focusCircles.style("opacity", 1);
      })
      .on("mouseout", () => {
        focusLine.style("opacity", 0);
        tooltip.style("opacity", 0);
        focusCircles.style("opacity", 0);
      })
      .on("mousemove", mousemove);
    
    function mousemove(event) {
      const mouseX = d3.pointer(event)[0];
      const xDate = x.invert(mouseX);
      
      // Update focus line position
      focusLine.attr("x1", mouseX).attr("x2", mouseX);
      
      // Format for tooltip display
      const formatDate = d3.timeFormat("%B %Y");
      
      // Find closest data points for each group
      let tooltipContent = `<strong>Date:</strong> ${formatDate(xDate)}<br><br>`;
      
      // Sort product groups for tooltip display (All-items first, then alphabetically)
      const sortedGroups = [...nested].sort((a, b) => {
        if (a[0] === "All-items") return -1;
        if (b[0] === "All-items") return 1;
        return a[0].localeCompare(b[0]);
      });
      
      sortedGroups.forEach(([groupName, groupData]) => {
        // Find closest data point
        const bisectDate = d3.bisector(d => d.date).left;
        const i = bisectDate(groupData, xDate, 1);
        
        // Ensure we have data on both sides
        if (i > 0 && i < groupData.length) {
          const d0 = groupData[i - 1];
          const d1 = groupData[i];
          const d = xDate - d0.date > d1.date - xDate ? d1 : d0;
          
          // Position the circle for this group
          focusCircles.select(`.circle-${groupName.replace(/\s+/g, '-').toLowerCase()}`)
            .attr("cx", x(d.date))
            .attr("cy", y(d.value));
          
          // Add to tooltip content
          const isAllItems = groupName === "All-items";
          tooltipContent += `
            <div style="display: flex; align-items: center; margin-bottom: 5px; 
                ${isAllItems ? 'font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 8px;' : ''}">
              <div style="width: 10px; height: 10px; background: ${color(groupName)}; margin-right: 8px;"></div>
              <strong>${groupName}:</strong> ${d.value.toFixed(1)}
            </div>
          `;
        }
      });
      
      // Update tooltip
      tooltip
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px")
        .html(tooltipContent);
    }
  }
  
  // Initialize the visualization with the first province
  updateVisualization();
  
  // Add event listener to the filter button
  d3.select("#filter-button").on("click", updateVisualization);
  
  // Add event listener to reset zoom
  d3.select("#reset-zoom").on("click", function() {
    d3.select("#vis3 svg g").transition()
      .duration(750)
      .call(d3.zoom().transform, d3.zoomIdentity);
  });
  
  // Add some CSS to style the UI controls
  const style = document.createElement('style');
  style.textContent = `
    .control-panel {
      background: #f8f8f8;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 15px;
    }
    
    #province-select {
      padding: 5px;
      margin: 0 10px;
      min-width: 150px;
    }
    
    button {
      background: #4676bd;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    button:hover {
      background: #3a5d8f;
    }
    
    .focus-line, .focus-circles {
      transition: opacity 0.2s;
    }
    
    .tooltip {
      transition: opacity 0.2s;
      max-width: 300px;
    }
    
    .line-group {
      transition: opacity 0.2s;
    }
    
    .line-group:hover {
      stroke-width: 3px;
    }
  `;
  document.head.appendChild(style);
})();