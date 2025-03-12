(async function() {
  // 1) Load CSV
  const data = await d3.csv("data/food_cpi_data.csv");

  // 2) Create UI controls for filtering
  const controlPanel = d3.select("#vis1")
    .append("div")
    .attr("class", "control-panel")
    .style("margin-bottom", "20px");
  
  // Add a title for the filter section
  controlPanel.append("div")
    .attr("class", "filter-title")
    .text("Calendar Heatmap Settings")
    .style("font-weight", "bold")
    .style("margin-bottom", "10px");
  
  // Add product selector
  const productSelector = controlPanel.append("div")
    .style("margin-bottom", "10px");
  
  productSelector.append("label")
    .text("Select Product Group: ")
    .attr("for", "product-select");
  
  // Parse data
  const parseDate = d3.timeParse("%Y-%m-%d");
  data.forEach(d => {
    d.date = parseDate(d["REF_DATE"]) || d3.timeParse("%Y-%m")(d["REF_DATE"]);
    d.value = +d["VALUE"];
  });
  
  // Get unique product groups
  const productGroups = [...new Set(data.map(d => d["Products and product groups"]))].sort();
  
  const productSelect = productSelector.append("select")
    .attr("id", "product-select")
    .style("margin-left", "10px")
    .style("padding", "5px")
    .style("min-width", "200px")
    .on("change", updateVisualization);
  
  productSelect.selectAll("option")
    .data(productGroups)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d)
    .property("selected", d => d === "Food"); // Default to "Food"
  
  // Add year range selector
  const yearRangeSelector = controlPanel.append("div")
    .style("margin-bottom", "10px");
  
  yearRangeSelector.append("label")
    .text("Year Range: ")
    .attr("for", "year-start");
  
  // Get all years from the data
  const years = [...new Set(data.map(d => d.date.getFullYear()))].sort();
  
  // Create start year dropdown
  const yearStartSelect = yearRangeSelector.append("select")
    .attr("id", "year-start")
    .style("margin", "0 10px")
    .style("padding", "5px")
    .on("change", function() {
      // Ensure end year is not before start year
      const startYear = +this.value;
      const endYear = +yearEndSelect.property("value");
      
      if (endYear < startYear) {
        yearEndSelect.property("value", startYear);
      }
      
      updateVisualization();
    });
  
  yearStartSelect.selectAll("option")
    .data(years)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d)
    .property("selected", d => d === years[years.length - 11]); // Default to 10 years ago
  
  yearRangeSelector.append("span").text("to");
  
  // Create end year dropdown
  const yearEndSelect = yearRangeSelector.append("select")
    .attr("id", "year-end")
    .style("margin-left", "10px")
    .style("padding", "5px")
    .on("change", function() {
      // Ensure start year is not after end year
      const endYear = +this.value;
      const startYear = +yearStartSelect.property("value");
      
      if (startYear > endYear) {
        yearStartSelect.property("value", endYear);
      }
      
      updateVisualization();
    });
  
  yearEndSelect.selectAll("option")
    .data(years)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d)
    .property("selected", d => d === years[years.length - 1]); // Default to latest year
  
  // Add color scale selector
  const colorSelector = controlPanel.append("div")
    .style("margin-bottom", "10px");
  
  colorSelector.append("label")
    .text("Color Scale: ")
    .attr("for", "color-scale");
  
  const colorScales = [
    { name: "Blues", value: "blues" },
    { name: "Reds", value: "reds" },
    { name: "Greens", value: "greens" },
    { name: "Purple-Green", value: "purplegreen" },
    { name: "Red-Blue", value: "redblue" }
  ];
  
  const colorSelect = colorSelector.append("select")
    .attr("id", "color-scale")
    .style("margin-left", "10px")
    .style("padding", "5px")
    .on("change", updateVisualization);
  
  colorSelect.selectAll("option")
    .data(colorScales)
    .enter()
    .append("option")
    .attr("value", d => d.value)
    .text(d => d.name);
  
  // Add view type selector (absolute values or monthly changes)
  const viewSelector = controlPanel.append("div")
    .style("margin-bottom", "10px");
  
  viewSelector.append("label")
    .text("View Type: ")
    .attr("for", "view-type");
  
  const viewSelect = viewSelector.append("select")
    .attr("id", "view-type")
    .style("margin-left", "10px")
    .style("padding", "5px")
    .on("change", updateVisualization);
  
  viewSelect.selectAll("option")
    .data([
      { name: "Absolute Values", value: "absolute" },
      { name: "Monthly Changes (%)", value: "changes" }
    ])
    .enter()
    .append("option")
    .attr("value", d => d.value)
    .text(d => d.name);
  
  // Add apply button
  controlPanel.append("button")
    .attr("class", "apply-filters-button")
    .text("Apply Settings")
    .style("padding", "5px 10px")
    .on("click", updateVisualization);
  
  // 3) Chart dimensions
  const margin = { top: 50, right: 30, bottom: 50, left: 40 },
        width = 960 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom,
        cellSize = 25; // cell size for calendar

  // 4) Create SVG + container for plotting
  const svg = d3.select("#vis1")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Add title
  const title = svg.append("text")
    .attr("class", "chart-title")
    .attr("x", width / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold");
  
  // Add a group for the calendar
  const calendarGroup = svg.append("g")
    .attr("class", "calendar-group");
  
  // Add legend group
  const legendGroup = svg.append("g")
    .attr("class", "legend-group")
    .attr("transform", `translate(${width - 260}, ${height - 40})`);
  
  // Add tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(255, 255, 255, 0.95)")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("padding", "8px")
    .style("box-shadow", "0 0 10px rgba(0,0,0,0.1)")
    .style("pointer-events", "none")
    .style("opacity", 0);
  
  // Initialize visualization
  updateVisualization();
  
  // Function to update visualization based on selected product and years
  function updateVisualization() {
    // Get selected product
    const selectedProduct = productSelect.property("value");
    
    // Get selected years range
    const startYear = +yearStartSelect.property("value");
    const endYear = +yearEndSelect.property("value");
    
    // Get selected color scale
    const selectedColorScale = colorSelect.property("value");
    
    // Get view type
    const viewType = viewSelect.property("value");
    
    // Filter data for selected product (Canada only) and years
    const filteredData = data.filter(d => 
      d["GEO"] === "Canada" && 
      d["Products and product groups"] === selectedProduct &&
      d.date.getFullYear() >= startYear &&
      d.date.getFullYear() <= endYear
    );
    
    // Update title
    title.text(`${viewType === "absolute" ? "CPI Values" : "Monthly CPI Changes"}: ${selectedProduct} (${startYear}-${endYear})`);
    
    // Process data for calendar view (monthly data)
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      const yearData = filteredData.filter(d => d.date.getFullYear() === year);
      
      // Sort by month
      yearData.sort((a, b) => a.date.getMonth() - b.date.getMonth());
      
      // Calculate monthly changes
      const monthlyData = [];
      for (let month = 0; month < 12; month++) {
        const monthData = yearData.filter(d => d.date.getMonth() === month);
        
        if (monthData.length > 0) {
          // Find previous month's data
          let change = 0;
          if (month > 0) {
            const prevMonth = yearData.filter(d => d.date.getMonth() === month - 1);
            if (prevMonth.length > 0) {
              change = ((monthData[0].value / prevMonth[0].value) - 1) * 100;
            }
          } else if (year > startYear) {
            // For January, compare with previous December
            const prevYear = filteredData.filter(d => d.date.getFullYear() === year - 1 && d.date.getMonth() === 11);
            if (prevYear.length > 0) {
              change = ((monthData[0].value / prevYear[0].value) - 1) * 100;
            }
          }
          
          monthlyData.push({
            date: monthData[0].date,
            value: monthData[0].value,
            change: change
          });
        } else {
          // If no data for this month, add placeholder
          monthlyData.push({
            date: new Date(year, month, 1),
            value: null,
            change: null
          });
        }
      }
      
      years.push({
        year,
        months: monthlyData
      });
    }
    
    // Define color scale function
    function getColorScale(type, domain) {
      switch(type) {
        case "blues":
          return d3.scaleSequential(d3.interpolateBlues)
            .domain(domain);
        case "reds":
          return d3.scaleSequential(d3.interpolateReds)
            .domain(domain);
        case "greens":
          return d3.scaleSequential(d3.interpolateGreens)
            .domain(domain);
        case "purplegreen":
          return d3.scaleSequential(d3.interpolatePRGn)
            .domain([domain[1], domain[0]]); // Invert for diverging
        case "redblue":
          return d3.scaleSequential(d3.interpolateRdBu)
            .domain([domain[1], domain[0]]); // Invert for diverging
        default:
          return d3.scaleSequential(d3.interpolateBlues)
            .domain(domain);
      }
    }
    
    // Find domain for color scale based on view type
    let colorScale;
    if (viewType === "absolute") {
      // Absolute values
      const values = filteredData.map(d => d.value).filter(v => v !== null);
      const minValue = d3.min(values);
      const maxValue = d3.max(values);
      colorScale = getColorScale(selectedColorScale, [minValue, maxValue]);
    } else {
      // Monthly changes
      const changes = [];
      years.forEach(year => {
        year.months.forEach(month => {
          if (month.change !== null) changes.push(month.change);
        });
      });
      
      const maxChange = Math.max(
        Math.abs(d3.min(changes) || 0),
        Math.abs(d3.max(changes) || 0)
      );
      
      // For changes, always use a diverging scale
      colorScale = d3.scaleSequential(d3.interpolateRdBu)
        .domain([maxChange, -maxChange]); // Red for positive (price increases), blue for negative
    }
    
    // Clear previous elements
    calendarGroup.selectAll("*").remove();
    legendGroup.selectAll("*").remove();
    
    // Set up the calendar layout
    const yearHeight = 160; // Height per year
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Draw each year's calendar
    years.forEach((yearData, i) => {
      const yearGroup = calendarGroup.append("g")
        .attr("class", "year")
        .attr("transform", `translate(0, ${i * yearHeight})`);
      
      // Add year label
      yearGroup.append("text")
        .attr("class", "year-label")
        .attr("x", 0)
        .attr("y", 20)
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text(yearData.year);
      
      // Draw month cells
      const monthGroups = yearGroup.selectAll(".month")
        .data(yearData.months)
        .enter()
        .append("g")
        .attr("class", "month")
        .attr("transform", (d, i) => `translate(${60 + i * (cellSize + 5)}, 0)`);
      
      // Add month labels
      monthGroups.append("text")
        .attr("class", "month-label")
        .attr("x", cellSize / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text((d, i) => monthLabels[i]);
      
      // Add month cells
      monthGroups.append("rect")
        .attr("class", "month-cell")
        .attr("x", 0)
        .attr("y", 30)
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("rx", 2)
        .attr("ry", 2)
        .attr("fill", d => {
          const value = viewType === "absolute" ? d.value : d.change;
          return value !== null ? colorScale(value) : "#eee";
        })
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
          // Highlight cell
          d3.select(this)
            .attr("stroke", "#333")
            .attr("stroke-width", 2);
            
          // Show tooltip
          const format = d3.format(viewType === "absolute" ? ".1f" : "+.2f");
          const value = viewType === "absolute" ? d.value : d.change;
          const formatDate = d3.timeFormat("%B %Y");
          
          tooltip
            .style("opacity", 1)
            .html(`
              <strong>${formatDate(d.date)}</strong><br>
              ${selectedProduct}<br>
              ${viewType === "absolute" ? "CPI: " : "Change: "}
              ${value !== null ? `${format(value)}${viewType === "changes" ? "%" : ""}` : "No data"}
            `);
        })
        .on("mousemove", function(event) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
          d3.select(this)
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1);
            
          tooltip.style("opacity", 0);
        });
      
      // Add value labels inside cells
      monthGroups.append("text")
        .attr("class", "value-label")
        .attr("x", cellSize / 2)
        .attr("y", 30 + cellSize / 2 + 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", d => {
          const value = viewType === "absolute" ? d.value : d.change;
          if (value === null) return "#999";
          
          // For absolute values, use black for all
          // For changes, make positive red and negative blue
          if (viewType === "absolute") {
            return "#000";
          } else {
            return value >= 0 ? "#000" : "#000";
          }
        })
        .text(d => {
          const value = viewType === "absolute" ? d.value : d.change;
          if (value === null) return "n/a";
          
          const format = d3.format(viewType === "absolute" ? ".0f" : "+.1f");
          return format(value) + (viewType === "changes" ? "%" : "");
        });
    });
    
    // Add legend
    if (viewType === "absolute") {
      // Sequential legend for absolute values
      const legendValues = d3.ticks(colorScale.domain()[0], colorScale.domain()[1], 5);
      
      legendGroup.append("text")
        .attr("class", "legend-title")
        .attr("x", 0)
        .attr("y", -10)
        .text("CPI Values");
      
      const legendWidth = 200;
      const legendHeight = 15;
      
      // Add gradient rectangle
      const defs = svg.append("defs");
      
      const linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient");
      
      linearGradient.selectAll("stop")
        .data(d3.range(10))
        .enter().append("stop")
        .attr("offset", (d, i) => `${i * 10}%`)
        .attr("stop-color", d => colorScale(d3.interpolate(colorScale.domain()[0], colorScale.domain()[1])(d / 10)));
      
      legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#linear-gradient)");
      
      // Add ticks
      const legendScale = d3.scaleLinear()
        .domain(colorScale.domain())
        .range([0, legendWidth]);
      
      const legendAxis = d3.axisBottom(legendScale)
        .tickValues(legendValues)
        .tickFormat(d3.format(".0f"));
      
      legendGroup.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);
      
    } else {
      // Diverging legend for changes
      const legendValues = d3.ticks(-colorScale.domain()[0], colorScale.domain()[0], 5);
      
      legendGroup.append("text")
        .attr("class", "legend-title")
        .attr("x", 0)
        .attr("y", -10)
        .text("Monthly Change (%)");
      
      const legendWidth = 200;
      const legendHeight = 15;
      
      // Add gradient rectangle
      const defs = svg.append("defs");
      
      const linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient-change");
      
      linearGradient.selectAll("stop")
        .data(d3.range(10))
        .enter().append("stop")
        .attr("offset", (d, i) => `${i * 10}%`)
        .attr("stop-color", d => colorScale(d3.interpolate(colorScale.domain()[0], colorScale.domain()[1])(d / 10)));
      
      legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#linear-gradient-change)");
      
      // Add ticks
      const legendScale = d3.scaleLinear()
        .domain([-colorScale.domain()[0], colorScale.domain()[0]])
        .range([0, legendWidth]);
      
      const legendAxis = d3.axisBottom(legendScale)
        .tickValues(legendValues)
        .tickFormat(d => `${d > 0 ? "+" : ""}${d.toFixed(1)}%`);
      
      legendGroup.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);
    }
  }
  
  // Add some CSS for styling
  const style = document.createElement('style');
  style.textContent = `
    .control-panel {
      background: #f8f8f8;
      padding: 10px;
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
    
    .month-cell {
      transition: stroke 0.2s;
      cursor: pointer;
    }
    
    .tooltip {
      transition: opacity 0.2s;
    }
  `;
  document.head.appendChild(style);
})();