(async function() {
  // Load CSV
  const data = await d3.csv("data/food_cpi_data.csv");
  
  // Parse date & numeric value
  const parseDate = d3.timeParse("%Y-%m-%d");
  data.forEach(d => {
    d.date = parseDate(d["REF_DATE"]) || d3.timeParse("%Y-%m")(d["REF_DATE"]);
    d.value = +d["VALUE"];
  });
  
  // Create UI controls for province and product selection
  const provinces = [...new Set(data.map(d => d["GEO"]))].sort();
  // Sort product groups so "All-items" appears first, then the rest alphabetically
  let productGroups = [...new Set(data.map(d => d["Products and product groups"]))];

  // Exclude certain product groups
  productGroups = productGroups.filter(pg =>
    pg !== "Bakery and cereal products (excluding baby food)" &&
    pg !== "Cereal products (excluding baby food)" &&
    pg !== "Fish, seafood and other marine products" &&
    pg !== "Preserved fruit and fruit preparations" &&
    pg !== "Preserved vegetables and vegetable preparations" &&
    pg !== "Vegetables and vegetable preparations"
  );

  productGroups.sort((a, b) => {
    if (a === "All-items") return -1;
    if (b === "All-items") return 1;
    return a.localeCompare(b);
  });

  // Create a container for UI controls
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

  // Set default province to Ontario
  provinceSelect.property("value", "Ontario");
  
  // Add product group filter section
  controlPanel.append("div")
    .attr("class", "filter-title")
    .text("Filter by Product Group")
    .style("font-weight", "bold")
    .style("margin", "10px 0");
  
  // Add toggle button to show/hide filters
  const toggleButton = controlPanel.append("button")
    .attr("class", "toggle-filters-button")
    .text("Show Product Filters")
    .style("margin-bottom", "10px")
    .style("padding", "5px 10px");

  // Container for product checkboxes
  const filterContainer = controlPanel.append("div")
    .attr("class", "filter-container")
    .style("display", "none")
    .style("max-height", "200px")
    .style("overflow-y", "auto")
    .style("border", "1px solid #ddd")
    .style("padding", "10px")
    .style("margin-bottom", "10px");
  
  // Toggle filter display logic
  toggleButton.on("click", function() {
    const isHidden = filterContainer.style("display") === "none";
    filterContainer.style("display", isHidden ? "block" : "none");
    toggleButton.text(isHidden ? "Hide Product Filters" : "Show Product Filters");
  });
  
  // Select all/none container
  const selectAllContainer = filterContainer.append("div")
    .style("margin-bottom", "10px");
  
  selectAllContainer.append("button")
    .text("Select All")
    .style("margin-right", "10px")
    .style("padding", "3px 8px")
    .on("click", function() {
      filterContainer.selectAll(".product-checkbox")
        .property("checked", true);
      updateVisualization();
    });
  
  selectAllContainer.append("button")
    .text("Select None")
    .style("padding", "3px 8px")
    .on("click", function() {
      filterContainer.selectAll(".product-checkbox")
        .property("checked", false);
      updateVisualization();
    });
  
  // Build checkboxes for each product group
  productGroups.forEach(product => {
    const checkboxContainer = filterContainer.append("div")
      .style("margin-bottom", "5px");
    
    checkboxContainer.append("input")
      .attr("type", "checkbox")
      .attr("id", `vis3-product-${product.replace(/\s+/g, '-').toLowerCase()}`)
      .attr("class", "product-checkbox")
      .attr("value", product)
      // Auto-select "Food" by default
      .property("checked", product === "Food")
      .on("change", updateVisualization);
    
    checkboxContainer.append("label")
      .attr("for", `vis3-product-${product.replace(/\s+/g, '-').toLowerCase()}`)
      .text(product)
      .style("margin-left", "5px");
  });
  
  // Add reset zoom button
  controlPanel.append("button")
    .attr("id", "reset-zoom")
    .text("Reset Zoom")
    .style("padding", "5px 10px")
    .on("click", function() {
      svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    });
  
  // Chart dimensions
  const totalWidth = 1000,
        totalHeight = 560;
  
  const margin = { top: 30, right: 300, bottom: 70, left: 80 },
        width = totalWidth - margin.left - margin.right,
        height = totalHeight - margin.top - margin.bottom;
  
  // Create SVG container
  const svg = d3.select("#vis3")
    .append("svg")
    .attr("width", totalWidth)
    .attr("height", totalHeight)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Add clip path to ensure content stays within chart boundaries
  svg.append("defs")
    .append("clipPath")
    .attr("id", "chart-area")
    .append("rect")
    .attr("width", width)
    .attr("height", height);
  
  // Create a group for the chart content that will be clipped
  const chartArea = svg.append("g")
    .attr("clip-path", "url(#chart-area)");
  
  // Create scales
  const x = d3.scaleTime().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);
  
  // Create axes groups
  const xAxis = svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${height})`);
  
  const yAxis = svg.append("g")
    .attr("class", "y-axis");
  
  // Axis labels
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
  
  // Chart title
  const title = svg.append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px");
  
  // Color scale
  const colorPalette = d3.schemeCategory10.concat(d3.schemeSet2);
  const color = d3.scaleOrdinal(colorPalette);
  
  // Hover line
  const focusLine = chartArea.append("line")
    .attr("class", "focus-line")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#999")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,3")
    .style("opacity", 0);
  
  // Create tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(255, 255, 255, 0.95)")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("padding", "10px")
    .style("box-shadow", "0 0 10px rgba(0,0,0,0.2)")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("z-index", "1000")
    .style("max-width", "300px");
  
  // Focus circles group
  const focusCircles = chartArea.append("g")
    .attr("class", "focus-circles")
    .style("opacity", 0);
  
  // Helper function to create a safe class name
  function makeSafeClassName(name) {
    return name.replace(/\s+/g, '-').replace(/[()]/g, '').toLowerCase();
  }
  
  // Create overlay for mouse tracking
  const overlay = chartArea.append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all");
  
  // Zoom setup
  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .extent([[0, 0], [width, height]])
    .translateExtent([[0, 0], [width, height]])
    .on("zoom", zoomed);
  
  // Apply zoom to SVG
  svg.call(zoom);
  
  // Mouse events for tooltip
  overlay
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
  
  // Store current transform for use in mousemove
  let currentTransform = d3.zoomIdentity;
  
  // Initial load
  updateVisualization();
  
  // Update chart based on selected province and products
  function updateVisualization() {
    // Clear existing lines and focus circles
    chartArea.selectAll(".line-group").remove();
    focusCircles.selectAll("*").remove();
    
    const selectedProvince = d3.select("#province-select").property("value");
    
    // Collect all checked product groups
    const selectedProducts = [];
    filterContainer.selectAll(".product-checkbox:checked").each(function() {
      selectedProducts.push(this.value);
    });
    
    // If truly none are selected, show empty chart and clear legend
    if (selectedProducts.length === 0) {
      title.text(`No products selected for ${selectedProvince}`);
      xAxis.call(d3.axisBottom(x).ticks(0));
      yAxis.call(d3.axisLeft(y).ticks(0));
      svg.selectAll(".legend").remove();
      return;
    }
    
    // Filter data for selected province & products
    const filteredData = data.filter(d => 
      d["GEO"] === selectedProvince && 
      selectedProducts.includes(d["Products and product groups"]) &&
      d.date
    );
    
    // Group data by product group
    const nested = d3.groups(filteredData, d => d["Products and product groups"]);
    nested.forEach(group => {
      group[1].sort((a, b) => a.date - b.date);
    });
    
    // Update color domain
    color.domain(nested.map(d => d[0]));
    
    // Update title
    title.text(`Food CPI Over Time for ${selectedProvince} (${selectedProducts.length} products)`);
    
    // Update scales
    const allDates = nested.flatMap(([, vals]) => vals).map(d => d.date);
    x.domain(d3.extent(allDates));
    
    const allValues = nested.flatMap(([, vals]) => vals).map(d => d.value);
    y.domain([0, d3.max(allValues) * 1.05]).nice();
    
    // Update axes
    xAxis.call(d3.axisBottom(x).ticks(10));
    yAxis.call(d3.axisLeft(y));
    
    // Line generator
    const lineGen = d3.line()
      .defined(d => !isNaN(d.value))
      .x(d => x(d.date))
      .y(d => y(d.value));
    
    // Draw lines
    const lines = chartArea.selectAll(".line-group")
      .data(nested)
      .join("path")
      .attr("class", "line-group")
      .attr("fill", "none")
      .attr("stroke", d => color(d[0]))
      .attr("stroke-width", d => d[0] === "All-items" ? 3 : 1.5)
      .attr("d", d => lineGen(d[1]));
    
    // Clear existing legend
    svg.selectAll(".legend").remove();
    
    // Create legend data sorted alphabetically
    const legendData = nested.map(d => d[0]).sort((a, b) => a.localeCompare(b));
    
    // Add a legend
    const legend = svg.selectAll(".legend")
      .data(legendData)
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
    
    // Create circles for hover
    nested.forEach(([groupName]) => {
      const safeClass = `circle-${makeSafeClassName(groupName)}`;
      focusCircles.append("circle")
        .attr("class", safeClass)
        .attr("r", 5)
        .attr("fill", color(groupName))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);
    });
  }
  
  function mousemove(event) {
    const mouseX = d3.pointer(event)[0];
    // Use the transformed scale if zooming has occurred
    const xScale = currentTransform.k > 1 ? currentTransform.rescaleX(x) : x;
    const xDate = xScale.invert(mouseX);
    
    focusLine.attr("x1", mouseX).attr("x2", mouseX);
    
    const formatDate = d3.timeFormat("%B %Y");
    let tooltipContent = `<strong>Date:</strong> ${formatDate(xDate)}<br><br>`;
    
    // Get data from updateVisualization
    const selectedProvince = d3.select("#province-select").property("value");
    const selectedProducts = [];
    filterContainer.selectAll(".product-checkbox:checked").each(function() {
      selectedProducts.push(this.value);
    });
    
    // Filter data
    const filteredData = data.filter(d => 
      d["GEO"] === selectedProvince && 
      selectedProducts.includes(d["Products and product groups"]) &&
      d.date
    );
    
    // Group data
    const nested = d3.groups(filteredData, d => d["Products and product groups"]);
    
    // Sort for tooltip display
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
          .attr("cx", xScale(d.date))  // Use transformed scale
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
  
  // Zoomed function for handling zoom events
  function zoomed(event) {
    // Store current transform for use in mousemove
    currentTransform = event.transform;
    
    // Create new scale based on zoom event
    const newX = event.transform.rescaleX(x);
    
    // Update x-axis
    xAxis.call(d3.axisBottom(newX).ticks(10));
    
    // Update lines
    chartArea.selectAll(".line-group").attr("d", function(d) {
      return d3.line()
        .defined(d => !isNaN(d.value))
        .x(d => newX(d.date))
        .y(d => y(d.value))
        (d[1]);
    });
    
    // Update focus elements during zoom
    if (event.sourceEvent && event.sourceEvent.type === "mousemove") {
      const mouseX = d3.pointer(event.sourceEvent, chartArea.node())[0];
      // Trigger mousemove to update tooltip and focus elements with new scale
      if (mouseX >= 0 && mouseX <= width) {
        overlay.dispatch("mousemove", { detail: event.sourceEvent });
      } else {
        // Hide elements if mouse is outside bounds
        focusLine.style("opacity", 0);
        focusCircles.style("opacity", 0);
        tooltip.style("opacity", 0);
      }
    }
  }
  
  // Automatically update chart on province change
  provinceSelect.on("change", updateVisualization);
})();
