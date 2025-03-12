// Enhanced vis3.js file with province filtering, product group exclusion, and improved zooming
(async function() {
  // 1) Load CSV
  const data = await d3.csv("data/food_cpi_data.csv");
  
  // 2) Parse date & numeric value
  const parseDate = d3.timeParse("%Y-%m-%d");
  data.forEach(d => {
    d.date = parseDate(d["REF_DATE"]) || d3.timeParse("%Y-%m")(d["REF_DATE"]);
    d.value = +d["VALUE"];
  });
  
  // Create UI controls
  const provinces = [...new Set(data.map(d => d["GEO"]))].sort();
  const controlPanel = d3.select("#vis3")
    .append("div")
    .attr("class", "control-panel");
  
  // Province selector
  const provinceSelector = controlPanel.append("div");
  provinceSelector.append("label")
    .text("Select Province: ")
    .attr("for", "province-select");
  
  const provinceSelect = provinceSelector.append("select")
    .attr("id", "province-select");
  
  provinceSelect.selectAll("option")
    .data(provinces)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);
  
  // Filter button
  controlPanel.append("button")
    .attr("id", "filter-button")
    .text("Apply Filter")
    .style("margin-right", "10px")
    .style("padding", "5px 10px");
  
  // Reset zoom button
  controlPanel.append("button")
    .attr("id", "reset-zoom")
    .text("Reset Zoom")
    .style("padding", "5px 10px");
  
  // 3) Chart dimensions
  // Match these to the .vis-canvas width & height in CSS
  const totalWidth = 820,
        totalHeight = 560;
  
  // Increase bottom margin if your x-axis label was getting cut off
  const margin = { top: 30, right: 120, bottom: 70, left: 80 },
        width = totalWidth - margin.left - margin.right,
        height = totalHeight - margin.top - margin.bottom;
  
  // Create SVG container
  const svg = d3.select("#vis3")
    .append("svg")
    .attr("width", totalWidth)
    .attr("height", totalHeight)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Helper function for safe class names
  function makeSafeClassName(name) {
    return name.replace(/\s+/g, '-').replace(/[()]/g, '').toLowerCase();
  }
  
  function updateVisualization() {
    svg.selectAll("*").remove();
    const selectedProvince = d3.select("#province-select").property("value");
    
    const excludedProducts = [
      "Food", 
      "Food purchased from stores",
      "Dairy products and eggs",
      "Bakery and cereal products (excluding baby food)",
      "Cereal products (excluding baby food)",
      "Vegetables and vegetable preparations",
      "Edible fats and oils",
      "Bakery products",
      "Preserved fruit and fruit preparations",
      "Preserved vegetables and vegetable preparations",
      "Fruit, fruit preparations and nuts",
      "Meat",
      "Processed meat",
      "Fish, seafood and other marine products"
    ];
    
    // Filter data
    const filteredData = data.filter(d =>
      d["GEO"] === selectedProvince &&
      d.date &&
      !excludedProducts.includes(d["Products and product groups"])
    );
    
    const nested = d3.groups(filteredData, d => d["Products and product groups"]);
    nested.forEach(group => {
      group[1].sort((a, b) => a.date - b.date);
    });
    
    // Scales
    const allDates = nested.flatMap(([, vals]) => vals).map(d => d.date);
    const x = d3.scaleTime()
      .domain(d3.extent(allDates))
      .range([0, width]);
    
    const allValues = nested.flatMap(([, vals]) => vals).map(d => d.value);
    const y = d3.scaleLinear()
      .domain([0, d3.max(allValues) * 1.05])
      .range([height, 0])
      .nice();
    
    // Axes
    const xAxis = svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).ticks(10));
    
    const yAxis = svg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y));
    
    // Axis labels
    svg.append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + 40)  // With bottom margin = 70, there's room for label
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
    
    // Color scale
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
    
    // Legend
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
    
    // Title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .text(`Food CPI Over Time for ${selectedProvince}`);
      
    // Zoom
    let focusLine, focusCircles;
    const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .extent([[0, 0], [width, height]])
      .on("zoom", zoomed);
    
    function zoomed(event) {
      const newX = event.transform.rescaleX(x);
      xAxis.call(d3.axisBottom(newX).ticks(10));
      
      lines.attr("d", d3.line()
        .defined(d => !isNaN(d.value))
        .x(d => newX(d.date))
        .y(d => y(d.value))
      );
      
      if (focusLine) {
        focusLine.style("display", "none");
      }
    }
    
    svg.append("rect")
      .attr("class", "zoom-rect")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .call(zoom);
    
    // Focus line
    focusLine = svg.append("line")
      .attr("class", "focus-line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#999")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .style("opacity", 0);
    
    // Tooltip
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
    
    // Focus circles
    focusCircles = svg.append("g")
      .attr("class", "focus-circles")
      .style("opacity", 0);
    
    nested.forEach(([groupName]) => {
      const safeClass = `circle-${makeSafeClassName(groupName)}`;
      focusCircles.append("circle")
        .attr("class", safeClass)
        .attr("r", 5)
        .attr("fill", color(groupName))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);
    });
    
    // Overlay for mouse tracking
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
      focusLine.attr("x1", mouseX).attr("x2", mouseX);
      
      const formatDate = d3.timeFormat("%B %Y");
      let tooltipContent = `<strong>Date:</strong> ${formatDate(xDate)}<br><br>`;
      
      const sortedGroups = [...nested].sort((a, b) => {
        if (a[0] === "All-items") return -1;
        if (b[0] === "All-items") return 1;
        return a[0].localeCompare(b[0]);
      });
      
      sortedGroups.forEach(([groupName, groupData]) => {
        const bisectDate = d3.bisector(d => d.date).left;
        const i = bisectDate(groupData, xDate, 1);
        
        if (i > 0 && i < groupData.length) {
          const d0 = groupData[i - 1];
          const d1 = groupData[i];
          const d = xDate - d0.date > d1.date - xDate ? d1 : d0;
          
          const safeClass = `circle-${makeSafeClassName(groupName)}`;
          focusCircles.select(`.${safeClass}`)
            .attr("cx", x(d.date))
            .attr("cy", y(d.value));
          
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
      
      tooltip
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px")
        .html(tooltipContent);
    }
  }
  
  // Initial load
  updateVisualization();
  
  // Filter button
  d3.select("#filter-button").on("click", updateVisualization);
  
  // Reset zoom
  d3.select("#reset-zoom").on("click", function() {
    d3.select("#vis3 svg g").transition()
      .duration(750)
      .call(d3.zoom().transform, d3.zoomIdentity);
  });
})();
