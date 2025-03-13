(async function() {
  // Load CSV
  const data = await d3.csv("data/food_cpi_data.csv");

  // Parse data
  const parseDate = d3.timeParse("%Y-%m");
  data.forEach(d => {
    d.date = parseDate(d["REF_DATE"]) || d3.timeParse("%Y-%m-%d")(d["REF_DATE"]);
    d.value = +d["VALUE"];
  });

  // Create filter control panel
  const controlPanel = d3.select("#vis2")
    .append("div")
    .attr("class", "control-panel");
  
  // Add a title for filters
  controlPanel.append("div")
    .attr("class", "filter-title")
    .text("Filter by Product Group");
  
  // Add toggle button to show/hide filters
  const toggleButton = controlPanel.append("button")
    .attr("class", "toggle-filters-button")
    .text("Show Filters");
  
  // Container for checkboxes
  const filterContainer = controlPanel.append("div")
    .attr("class", "filter-container")
    .style("display", "none");
  
  // Toggle filter visibility
  toggleButton.on("click", function() {
    const isHidden = filterContainer.style("display") === "none";
    filterContainer.style("display", isHidden ? "block" : "none");
    toggleButton.text(isHidden ? "Hide Filters" : "Show Filters");
  });
  
  // Get unique product groups
  let productGroups = [...new Set(data.map(d => d["Products and product groups"]))].sort();
  
  // Remove unwanted categories
  productGroups = productGroups.filter(pg =>
    pg !== "Bakery and cereal products (excluding baby food)" &&
    pg !== "Cereal products (excluding baby food)" &&
    pg !== "Fish, seafood and other marine products" &&
    pg !== "Preserved fruit and fruit preparations" &&
    pg !== "Preserved vegetables and vegetable preparations" &&
    pg !== "Vegetables and vegetable preparations"
  );
  
  // Add select all/none container
  const selectAllContainer = filterContainer.append("div")
    .attr("class", "select-all-container");
  
  selectAllContainer.append("button")
    .attr("class", "select-all-button")
    .text("Select All")
    .on("click", function() {
      filterContainer.selectAll(".product-checkbox")
        .property("checked", true);
      updateVisualization();
    });
  
  selectAllContainer.append("button")
    .attr("class", "select-none-button")
    .text("Select None")
    .on("click", function() {
      filterContainer.selectAll(".product-checkbox")
        .property("checked", false);
      updateVisualization();
    });
  
  // Add checkboxes for each product group
  productGroups.forEach(product => {
    const checkboxContainer = filterContainer.append("div")
      .attr("class", "checkbox-container");
    
    checkboxContainer.append("input")
      .attr("type", "checkbox")
      .attr("class", "product-checkbox")
      .attr("id", `vis2-product-${product.replace(/\s+/g, '-').toLowerCase()}`)
      .attr("value", product)
      .property("checked", true)  // Default to all checked
      .on("change", updateVisualization);
    
    checkboxContainer.append("label")
      .attr("for", `vis2-product-${product.replace(/\s+/g, '-').toLowerCase()}`)
      .text(cleanLabel(product));
  });

  
  // Chart dimensions
  const margin = { top: 40, right: 30, bottom: 120, left: 60 },
        width  = 800 - margin.left - margin.right,
        height = 500 - margin.top  - margin.bottom;
  
  // Create SVG
  const svg = d3.select("#vis2")
    .append("svg")
    .attr("width",  width  + margin.left + margin.right)
    .attr("height", height + margin.top  + margin.bottom);
  
  // A group for content
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Add title
  const title = g.append("text")
    .attr("class", "chart-title")
    .attr("x", width/2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px");
  
  // Create scales
  const x = d3.scaleLinear()
    .range([0, width]);     
  
  const y = d3.scaleLinear()
    .range([height, 0]);
  
  // Create axes groups
  const xAxisG = g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);
  
  const yAxisG = g.append("g")
    .attr("class", "y-axis");
  
  // Create tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip-bar")
    .style("display", "none")
    .style("pointer-events", "none");
  
  // Initialize with all products
  updateVisualization();
  
  // Helper function to clean product labels
  function cleanLabel(label) {
    return label.replace(" (excluding poultry)", "");
  }
  
  // Function to update visualization based on selected products
  function updateVisualization() {
    // Get selected products
    const selectedProducts = [];
    filterContainer.selectAll(".product-checkbox:checked").each(function() {
      selectedProducts.push(this.value);
    });
    
    // Filter data for selected products
    const filteredData = data.filter(d => selectedProducts.includes(d["Products and product groups"]));
    
    // Aggregate by product group 
    const groupRollup = d3.rollups(
      filteredData,
      v => d3.mean(v, d => d.value),
      d => d["Products and product groups"]
    );
    
    // Clean product names for display
    const barData = groupRollup.map(([product, avgValue]) => ({
      product: cleanLabel(product),
      avgValue
    }));
    
    // Sort bars by value (descending)
    barData.sort((a, b) => b.avgValue - a.avgValue);
    
    // Update title
    title.text(`Avg CPI by Product Group (Canada, ${barData.length} Products)`);
    
    // Update scales
    const n = barData.length;
    x.domain([0, n]);
    y.domain([0, d3.max(barData, d => d.avgValue) * 1.05]).nice();
    
    // Update x-axis
    const xAxis = d3.axisBottom(x)
      .tickValues(d3.range(n))
      .tickFormat(i => barData[i].product)
      .tickSizeOuter(0);
      
    xAxisG.call(xAxis)
      .selectAll("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-45) translate(-5,-5)")
        .style("font-size", "10.5px")
        .style("font-family", "Arial, sans-serif");
    
    // Update y-axis
    yAxisG.call(d3.axisLeft(y));
    
    // Bar padding
    const barPadding = 0.1;
    
    // Update bars using join pattern
    const bars = g.selectAll(".bar")
      .data(barData, d => d.product);
      
    bars.exit().remove();
    
    bars.enter()
      .append("rect")
      .attr("class", "bar")
      .merge(bars)
      .attr("x", (d, i) => x(i + barPadding))
      .attr("width", (d, i) => x(i+1 - barPadding) - x(i + barPadding))
      .attr("y", d => y(d.avgValue))
      .attr("height", d => height - y(d.avgValue))
      .on("mouseover", function(event, d) {
        tooltip
          .style("display", "inline-block")
          .html(`<strong>${d.product}</strong><br>Avg: ${d.avgValue.toFixed(2)}`);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        tooltip.style("display", "none");
      });
  }
})();
