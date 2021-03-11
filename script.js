const margin = {t: 30, r:50, b: 50, l: 50};
const size = {w: 1300, h: 720};
const svg = d3.select('svg');
const canvasSize = {w: size.w - margin.l - margin.r, h: size.h - margin.t - margin.b}
const colorPalette = ["#edb158","#6882a3","#e34819"];

svg.attr('width', size.w)
    .attr('height', size.h);

const containerG = svg.append('g').classed('container', true)
    .attr('transform', `translate(${margin.l}, ${margin.t})`);

let radialForce = false;

Promise.all([
    d3.csv('/data/reduced_airbnb.csv')
]).then(data => {

    let airbnbData = data[0];
    airbnbData.forEach(d => d.price = +d.price);
    
    //CREATING ROOM TYPES LIST
    let roomTypes = new Set(airbnbData.map(d => d.roomType));
    roomTypes = Array.from(roomTypes);

    let radius = 4;

    //CREATING SCALE
    let extent = d3.extent(airbnbData, d => d.price);
    let scaleX = d3.scaleLinear()
        .domain([0, extent[1]])
        .range([0, canvasSize.w]);
    
    let colorScale = d3.scaleOrdinal()
        .domain(roomTypes)
        .range(colorPalette)
    
    //CREATING AXES
    let axisX = d3.axisTop(scaleX)
        .tickFormat(d => `$${+d}`)
        .tickSize(-canvasSize.h)
        .tickSizeOuter(0);
    
    let axisG = containerG.selectAll('g.axis')
        .data([1])
        .join('g');

    axisG
        .attr('transform', 'translate(0, 10)')
        .classed('axis', true)
        .call(axisX);

        
    //CREATING FORCE SIMULATION

    let simulation = d3.forceSimulation(airbnbData)
        .force('x', d3.forceX(d => scaleX(d.price)).strength(1.0))
        .force('y', d3.forceY(canvasSize.h/2).strength(5.5))
        .force('collide', d3.forceCollide().radius(radius).strength(35.0).iterations(4))
        .stop();

    let simulationRadial = d3.forceSimulation(airbnbData)
        .force('r', d3.forceRadial(d => {
            if (d.price < 100) return 300;
            else if (d.price < 200) return 250;
            else if (d.price < 400) return 200;
            else if (d.price < 600) return 150;
            else return 100;
        }, canvasSize.w/2, canvasSize.h/2).strength(2.0))
        .force('collide', d3.forceCollide().strength(0.1))
        .stop();

    for(let i = 0; i < 10; i++ ){
        simulation.tick();
    }

    let circles = containerG.selectAll('.dots')
        .data(airbnbData)
        .join('circle')
        .attr('cx', d => Math.random()*canvasSize.w)
        .attr('cy', d => Math.random()*canvasSize.h)
        .attr('r', 3.5)
        .attr('fill', d => colorScale(d.roomType))
        .classed('dots', true)
        .transition()
        .delay(500)
        .duration(1000)
        .ease(d3.easePoly.exponent(4.0))
        .attr('cx', d => scaleX(d.price))
        .attr('cy', d => d.y)
        .attr('r', radius)

    appendLegend();
    appendAnnotation();
    layoutSwitch();

//--------FUNCTIONS--------

    //appending legends
    function appendLegend(){
        let position = {x:canvasSize.w - 450,y:canvasSize.h + 30};
        let legendStep = 150;

        let legend = containerG.append('g')
            .attr('transform', `translate(${position.x}, ${position.y})`);

        let legendSymbol = legend.selectAll('.symbol')
            .data(roomTypes);

        legendSymbol.join('circle')
            .classed('legend', true)
            .classed('symbol', true)
            .attr('cx', (d, i) => i*legendStep)
            .attr('cy', d => 0)
            .attr('r', 5)
            .attr('fill', d => colorScale(d)); 

        let legendText = legend.selectAll('.legendText')
            .data(roomTypes);
        
        legendText.join('text')
            .classed('legend', true)
            .classed('legendText', true)
            .attr('x', (d, i) => i*legendStep + 10)
            .attr('y', 4)
            .attr('fill', 'rgb(63, 100, 133)')
            .text(d => d);
    }

    //appending annotation for the radial force layout
    function appendAnnotation(){
        let position = {x: canvasSize.w -150, y: canvasSize.h - 80}
        let annotation = containerG.append('g')
            .classed('annotation', true)            
            .attr('transform', `translate(${position.x}, ${position.y})`)
            .style('visibility', 'hidden');

        let radius = [80, 65, 50, 35, 20];
        let prices = ['100', '200', '400', '600', '>600']

        anoCircle = annotation.selectAll('.circleSymbol')   
            .data(radius);
        anoBlock = annotation.selectAll('.anoBlock')
            .data(radius);
        anoText = annotation.selectAll('.anoText')
            .data(prices);

        anoCircle.join('circle')
            .classed('circleSymbol', true)
            .attr('cx',0)
            .attr('cy',0)
            .attr('r', d => d)
            .attr('stroke', 'rgb(63, 100, 133)')
            .attr('fill', 'none');

        anoBlock.join('rect')
            .classed('anoBlock', true)
            .attr('x', -18)
            .attr('y', d => -d-5)
            .attr('width', 36)
            .attr('height', 12)
            .attr('fill', 'rgb(235, 232, 226)');

        anoText.join('text')
            .classed('anoText', true)
            .attr('x', 0)
            .attr('y', (d, i) => -radius[i]+5)
            .attr('fill', 'rgb(63, 100, 133)')
            .text(d => `$${d}`);
    }

    //updating the layout when clicking the switch on the page
    function layoutSwitch(){
        d3.select('input').on('click',function(e){
            radialForce = !radialForce;
            tick();
        });
    }

    //re-calculating circles' positions accoring to the corresponded force simulation
    function tick(){
        if(radialForce){
            for(let i = 0; i < 10; i++ ) simulationRadial.tick();
            let c = d3.selectAll('.dots');

            c.transition()
                .duration(1000)
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            
            d3.select('.alert').style('visibility', 'visible');
            d3.select('.axis').style('visibility', 'hidden');
            d3.select('.annotation').style('visibility', 'visible');
        } else {
            for(let i = 0; i < 10; i++ ) simulation.tick();
            
            let c = d3.selectAll('.dots');
            c.transition()
                .duration(1000)
                .attr('cx', d => scaleX(d.price))
                .attr('cy', d => d.y);
            d3.select('.alert').style('visibility', 'hidden');
            d3.select('.axis').style('visibility', 'visible');
            d3.select('.annotation').style('visibility', 'hidden');
        }
    }
});