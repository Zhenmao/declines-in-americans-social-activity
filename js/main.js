d3.csv("data/data.csv", d3.autoType).then((data) => {
  ///////////////////////////////////////////////////////////
  //// Setup ////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  let width, height, isNarrow;

  const t1 = data.columns[1];
  const t2 = data.columns[2];

  const keyAccessor = (d) => d[data.columns[0]];
  const v1Accessor = (d) => d[t1];
  const v2Accessor = (d) => d[t2];

  const vDiffAccessor = (d) => d[t2] - d[t1];

  const minWidth = 500;
  const narrowThreshold = 800;

  const marginTop = 48;
  const marginRight = 40;
  const marginBottom = 48;
  const narrowMarginLeft = 16;
  const wideMarginLeft = 304;
  const rowContentHeight = 32;
  const rowLabelHeight = 18;
  const columnGap = 48;
  const labelPadding = 8;
  const rowTitlePadding = 24;

  const arrowLineWidth = 3;
  const arrowCircleRadius = 5;
  const arrowArrowSize = 12;

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent([...data.map(v1Accessor), ...data.map(v2Accessor)]))
    .nice();

  const xDiffScale = d3
    .scaleLinear()
    .domain(d3.extent(data, vDiffAccessor))
    .nice();

  const yScale = d3.scalePoint().domain(data.map(keyAccessor)).padding(0.5);

  const colorScale = d3
    .scaleThreshold()
    .domain([0])
    .range(["var(--color-decline)", "var(--color-increase)"]);

  const formatTime = d3.format("d");
  const formatValue = d3.format("d");
  const formatDiff = (d) => (d === 0 ? "0" : d3.format("+d")(d));

  ///////////////////////////////////////////////////////////
  //// Render ///////////////////////////////////////////////
  ///////////////////////////////////////////////////////////
  const container = d3.select("#chart").classed("chart", true);
  const svg = container.append("svg");
  const rowTitlesG = svg.append("g");
  const g = svg.append("g");
  const diffG = svg.append("g");
  const legendG = svg.append("g");

  new ResizeObserver(resized).observe(container.node());

  renderLegend();

  function resized() {
    const newWidth = Math.max(minWidth, container.node().clientWidth);
    if (width === newWidth) return;
    width = newWidth;
    isNarrow = width < narrowThreshold;

    computeXAxisRanges();
    computeYAxisRange();

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    render();
  }

  function computeXAxisRanges() {
    const xExtent = xScale.domain()[1] - xScale.domain()[0];
    const xDiffExtent = xDiffScale.domain()[1] - xDiffScale.domain()[0];
    const xTotalExtent = xExtent + xDiffExtent;

    const marginLeft = isNarrow ? narrowMarginLeft : wideMarginLeft;

    const unitSize =
      (width - marginLeft - marginRight - columnGap) / xTotalExtent;

    xScale.range([marginLeft, marginLeft + unitSize * xExtent]);
    xDiffScale.range([
      width - marginRight - unitSize * xDiffExtent,
      width - marginRight,
    ]);
  }

  function computeYAxisRange() {
    const rowHeight = isNarrow
      ? rowContentHeight + rowLabelHeight
      : rowContentHeight;
    height = marginTop + marginBottom + rowHeight * data.length;

    const align = isNarrow
      ? (rowLabelHeight / 2 + rowContentHeight) / rowHeight
      : 0.5;

    yScale.range([marginTop, height - marginBottom]).align(align);
  }

  function render() {
    renderRowTitles();
    g.call(renderArrowChart, {
      x1Accessor: v1Accessor,
      x2Accessor: v2Accessor,
      yAccessor: keyAccessor,
      colorAccessor: vDiffAccessor,
      xScale,
      yScale,
      colorScale,
      xTickFormat: formatValue,
      xValueFormat: formatValue,
      xTitle: "Percentage",
    });

    diffG.call(renderArrowChart, {
      x1Accessor: () => 0,
      x2Accessor: vDiffAccessor,
      yAccessor: keyAccessor,
      colorAccessor: vDiffAccessor,
      xScale: xDiffScale,
      yScale,
      colorScale,
      xTickFormat: formatDiff,
      xValueFormat: (d) => (d === 0 ? "" : formatDiff(d)),
      xTitle: "Percent Point Change",
    });
  }

  function renderRowTitles() {
    rowTitlesG
      .selectAll(".row__title")
      .data(yScale.domain(), (d) => d)
      .join((enter) =>
        enter
          .append("text")
          .attr("class", "row__title")
          .text((d) => d),
      )
      .attr("transform", (d) => `translate(0,${yScale(d)})`)
      .attr("text-anchor", isNarrow ? "start" : "end")
      .attr("dy", isNarrow ? null : "0.32em")
      .attr("x", isNarrow ? 0 : wideMarginLeft - rowTitlePadding)
      .attr("y", isNarrow ? -rowContentHeight / 2 : 0);
  }

  function renderLegend() {
    const timeLabelWidth = 48;
    const arrowLength = 128;
    const legendItemWidth = timeLabelWidth * 2 + arrowLength + 48;

    const arrowG = legendG
      .selectChildren(".arrow")
      .data([
        {
          x1: timeLabelWidth + arrowLength,
          x2: timeLabelWidth,
          color: colorScale(-1),
          title: "Decline",
        },
        {
          x1: timeLabelWidth,
          x2: timeLabelWidth + arrowLength,
          color: colorScale(1),
          title: "Increase",
        },
      ])
      .join("g")
      .attr("class", "arrow")
      .attr("transform", (_, i) => `translate(${i * legendItemWidth},${24})`);

    arrowG
      .append("line")
      .attr("class", "arrow__line")
      .attr("stroke-width", arrowLineWidth)
      .attr("stroke", (d) => d.color)
      .attr("x1", (d) => d.x1)
      .attr("x2", (d) => d.x2);

    arrowG
      .append("circle")
      .attr("class", "arrow__circle")
      .attr("r", arrowCircleRadius)
      .attr("fill", (d) => d.color)
      .attr("cx", (d) => d.x1);

    arrowG
      .append("path")
      .attr("class", "arrow__arrow")
      .attr(
        "d",
        `M${-arrowArrowSize / 2},${-arrowArrowSize / 2} L${-arrowArrowSize / 2},${arrowArrowSize / 2} L${arrowArrowSize / 2},0 Z`,
      )
      .attr("fill", (d) => d.color)
      .attr(
        "transform",
        (d) => `translate(${d.x2},0)rotate(${d.x2 - d.x1 < 0 ? 180 : 0})`,
      );

    arrowG
      .selectChildren(".arrow__value")
      .data((d) =>
        [
          { x: d.x1, text: formatTime(t1) },
          { x: d.x2, text: formatTime(t2) },
        ].sort((a, b) => d3.ascending(a.x, b.x)),
      )
      .join("text")
      .attr("class", "arrow__value")
      .attr("dy", "0.32em")
      .attr("text-anchor", (_, i) => (i === 0 ? "end" : "start"))
      .attr("dx", (_, i) => (i === 0 ? -labelPadding : +labelPadding))
      .attr("x", (d) => d.x)
      .text((d) => d.text);

    arrowG
      .append("text")
      .attr("class", "arrow__title")
      .attr("text-anchor", "middle")
      .attr("y", -labelPadding)
      .style("color", (d) => d.color)
      .attr("x", (d) => (d.x1 + d.x2) / 2)
      .text((d) => d.title);
  }

  ///////////////////////////////////////////////////////////
  //// Arrow chart //////////////////////////////////////////
  ///////////////////////////////////////////////////////////

  function renderArrowChart(
    g,
    {
      x1Accessor,
      x2Accessor,
      yAccessor,
      colorAccessor,
      xScale,
      yScale,
      colorScale,
      xTickFormat,
      xValueFormat,
      xTitle,
    },
  ) {
    const isDiverging = xScale.domain()[0] * xScale.domain()[1] < 0;

    g.selectChildren(".axis")
      .data([0])
      .join((enter) => enter.append("g").attr("class", "axis"))
      .attr("transform", `translate(0,${yScale.range()[1]})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickSize(6)
          .tickPadding(labelPadding)
          .tickFormat(xTickFormat)
          .ticks((xScale.range()[1] - xScale.range()[0]) / 80),
      )
      .attr("font-size", null)
      .attr("font-family", null)
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .attr("y1", (d) =>
            d === 0 && isDiverging
              ? -(yScale.range()[1] - yScale.range()[0])
              : null,
          ),
      );

    g.selectChildren(".axis__title")
      .data([0])
      .join((enter) =>
        enter
          .append("text")
          .attr("class", "axis__title")
          .attr("text-anchor", "middle")
          .attr("dy", "0.71em")
          .text(xTitle),
      )
      .attr(
        "transform",
        `translate(${(xScale.range()[0] + xScale.range()[1]) / 2},${yScale.range()[1] + 32})`,
      );

    const rowG = g
      .selectChildren(".rows")
      .data([0])
      .join((enter) => enter.append("g").attr("class", "rows"))
      .selectChildren(".row")
      .data(data, yAccessor)
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "row")
          .style("--color-change", (d) => colorScale(colorAccessor(d)))
          .call((g) =>
            g
              .append("line")
              .attr("class", "arrow__line")
              .attr("stroke-width", arrowLineWidth)
              .attr("stroke", "var(--color-change)"),
          )
          .call((g) =>
            g
              .append("circle")
              .attr("class", "arrow__circle")
              .attr("r", arrowCircleRadius)
              .attr("fill", "var(--color-change)"),
          )
          .call((g) =>
            g
              .append("path")
              .attr("class", "arrow__arrow")
              .attr(
                "d",
                `M${-arrowArrowSize / 2},${-arrowArrowSize / 2} L${-arrowArrowSize / 2},${arrowArrowSize / 2} L${arrowArrowSize / 2},0 Z`,
              )
              .attr("fill", "var(--color-change)"),
          ),
      )
      .attr("transform", (d) => `translate(0,${yScale(yAccessor(d))})`);

    rowG
      .select(".arrow__line")
      .attr("x1", (d) => xScale(x1Accessor(d)))
      .attr("x2", (d) => xScale(x2Accessor(d)));

    rowG.select(".arrow__circle").attr("cx", (d) => xScale(x1Accessor(d)));

    rowG
      .select(".arrow__arrow")
      .attr(
        "transform",
        (d) =>
          `translate(${xScale(x2Accessor(d))},0)rotate(${x2Accessor(d) - x1Accessor(d) < 0 ? 180 : 0})`,
      );

    rowG
      .selectChildren(".row__value")
      .data((d) =>
        [{ x: x1Accessor(d) }, { x: x2Accessor(d) }].sort((a, b) =>
          d3.ascending(a.x, b.x),
        ),
      )
      .join((enter) =>
        enter.append("text").attr("class", "row__value").attr("dy", "0.32em"),
      )
      .attr("text-anchor", (_, i) => (i === 0 ? "end" : "start"))
      .attr("dx", (_, i) => (i === 0 ? -labelPadding : +labelPadding))
      .attr("x", (d) => xScale(d.x))
      .text((d) => xValueFormat(d.x));
  }
});
