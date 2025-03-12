(async function() {
  // 1) Load CSV
  const data = await d3.csv("data/food_cpi_data.csv");

  // 2) Parse data
  const parseDate = d3.timeParse("%Y-%m");
  data.forEach(d => {
    d.date = parseDate(d["REF_DATE"]) || d3.timeParse("%Y-%m-%d")(d["REF_DATE"]);
    d.value = +d["VALUE"];
  });

  // Create filter control panel
  const controlPanel = d3.select("#vis2")
    .append("div")
    .attr("class", "control-panel")
    .style("margin-bottom", "20px");
  
  // Add a title for filters
  controlPanel.append("div")
    .attr("class", "filter-title")
    .text("Filter by Product Group")
    .style("font-weight", "bold")
    .style("margin-bottom", "10px");
  
  // Add toggle button to show/hide filters
  const toggleButton = controlPanel.append("button")
    .attr("class", "toggle-filters-button")
    .text("Show Filters")
    .style("margin-bottom", "10px")
    .style("padding", "5px 10px");
  
  // Container for checkboxes
  const filterContainer = controlPanel.append("div")
    .attr("class", "filter-container")
    .style("display", "none")
    .style("max-height", "200px")
    .style("overflow-y", "auto")
    .style("border", "1px solid #ddd")
    .style("padding", "10px")
    .style("margin-bottom", "10px");
  
  // Toggle filter visibility
  toggleButton.on("click", function() {
    const isHidden = filterContainer.style("display") === "none";
    filterContainer.style("display", isHidden ? "block" : "none");
    toggleButton.text(isHidden ? "Hide Filters" : "Show Filters");
  });
  
  // Get unique product groups
  const productGroups = [...new Set(data.map(d => d["Products and product groups"]))].sort();
  
  // Add select all/none buttons
  const selectAllContainer = filterContainer.append("div")
    .style("margin-bottom", "10px");
  
  selectAllContainer.append("button")
    .text("Select All")
    .style("margin-right", "10px")
    .style("padding", "3px 8px")
    .on("click", function() {
      filterContainer.selectAll(".product-checkbox")
        .property("checked", true);
    });
  
  selectAllContainer.append("button")
    .text("Select None")
    .style("padding", "3px 8px")
    .on("click", function() {
      filterContainer.selectAll(".product-checkbox")
        .property("checked", false);
    });
  
  // Add checkboxes for each product group
  productGroups.forEach(product => {
    const checkboxContainer = filterContainer.append("div")
      .style("margin-bottom", "5px");
    
    checkboxContainer.append("input")
      .attr("type", "checkbox")
      .attr("id", `vis2-product-${product.replace(/\s+/g, '-').toLowerCase()}`)
      .attr("class", "product-checkbox")
      .attr("value", product)
      .property("checked", true)  // Default to all checked
      .on("change", function() {
        // Enable apply button when checkboxes change
        applyButton.property("disabled", false);
      });
    
    checkboxContainer.append("label")
      .attr("for", `vis2-product-${product.replace(/\s+/g, '-').toLowerCase()}`)
      .text(product)
      .style("margin-left", "5px");
  });
  
  // Add apply button
  const applyButton = controlPanel.append("button")
    .attr("class", "apply-filters-button")
    .text("Apply Filters")
    .style("padding", "5px 10px")
    .property("disabled", true)
    .on("click", function() {
      updateVisualization();
      applyButton.property("disabled", true);
    });

  // 4) Chart dimensions
  const margin = { top: 40, right: 30, bottom: 120, left: 60 },
        width  = 800 - margin.left - margin.right,
        height = 500 - margin.top  - margin.bottom;

  // 5) Create SVG
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
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "#fff")
    .style("border", "1px solid #333")
    .style("border-radius", "4px")
    .style("padding", "8px")
    .style("display", "none")
    .style("pointer-events", "none")
    .style("box-shadow", "0 4px 8px rgba(0,0,0,0.1)");

  // Initialize with all products
  updateVisualization();

  // Function to update visualization based on selected products
  function updateVisualization() {
    // Get selected products
    const selectedProducts = [];
    filterContainer.selectAll(".product-checkbox:checked").each(function() {
      selectedProducts.push(this.value);
    });
    
    // Filter data for selected products
    const filteredData = data.filter(d => selectedProducts.includes(d["Products and product groups"]));
    
    // 3) Aggregate by product group (mean across all data)
    const groupRollup = d3.rollups(
      filteredData,
      v => d3.mean(v, d => d.value),
      d => d["Products and product groups"]
    );
    
    // Transform into an array of objects
    const barData = groupRollup.map(([product, avgValue]) => ({
      product,
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
        .style("font-size", "6px") // Smaller font size for x-axis labels
        .style("font-family", "Arial, sans-serif"); // Ensure consistent font family
    
    // Update y-axis
    yAxisG.call(d3.axisLeft(y));
    
    // Bar padding
    const barPadding = 0.1;
    
    // Update bars using join pattern
    const bars = g.selectAll(".bar")
      .data(barData);
      
    // Remove bars that are no longer in the data
    bars.exit().remove();
    
    // Add new bars
    bars.enter()
      .append("rect")
      .attr("class", "bar")
      .attr("fill", "steelblue")
      .merge(bars) // Update existing bars
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

  // Add CSS for styling
  const style = document.createElement('style');
  style.textContent = `
    .control-panel {
      background: #f8f8f8;
      padding: 10px;
      border-radius: 4px;
    }
    
    .filter-container {
      background: #fff;
      border-radius: 4px;
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
    
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .bar {
      transition: fill 0.3s;
    }
    
    .bar:hover {
      fill: #ff7f0e;
    }
  `;
  document.head.appendChild(style);
})();