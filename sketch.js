const devMode = false;

function preload() {
  // Load the Heldane Display font
  heldaneFont = loadFont('assets/HeldaneDisplay-Regular.ttf');
  fontSourceSansProRegular = loadFont('assets/SourceSansPro-Regular.ttf');
}

// Data config
const minX = 0;
const maxX = 100;
const minY = 0;
const maxY = 200;
const x_axis_label = "Ålder (år)";
const y_axis_label = "Längd (cm)";
const initialMessage = "Klicka här";
const orangeBeanHintText = "Ny böna upplåst. \n Klicka här under x-axeln för att predicera"; 
const noise_factor = 1.2; // Adjusted noise factor

// UI config
const showDataPointValues = true;
const showDataPointImage = false;
const showDataPointSimplePoint = true;
const usePredictedPoints = true;
const predictedPointAnimationSpeed = 0.02;
const predictedPointDelayBeforeAnimation = 2;
const left_margin_chart = 50;
const top_margin_chart = 50;
const right_margin_chart = 50;
const bottom_margin_chart = 100;

// Siggan styles
const siggan_style = {
  colors: {
    backgroundBeige: '#f2e6d0',
    axis: '#969696',
    point: '#000000', // black
    text: '#112147', // dark gray
    text80: '#112147', // dark gray
    line: '#f96600', // red
  },
  fonts: {
    main: 'Arial',  // font-family
    size: {
      small: 12,
      medium: 16,
      large: 20,
    },
    weight: {
      normal: 'normal',
      bold: 'bold',
    },
  },
};

// Data generation
let heldaneFont;
let data_points = [];
let predicted_data_points = [];
let old_predicted_data_points = [];
let m = 0;
let b = 0;
let clickCount = 0;
let svgImage;
let svgImage2;
let opacityPointLabels = 256;
let correlation = 0;

function setup() {
  createCanvas(900, 900);
  background(siggan_style.colors.backgroundBeige);
  let text80 = color(siggan_style.colors.text);
  text80.setAlpha(150);
  siggan_style.colors["text80"] = text80;
  displayInitialMessage();

  // Load the SVG images
  svgImage = loadImage('assets/johnny.svg');
  svgImage2 = loadImage('assets/johnny_orange.svg');


  // Add two random points for testing the linear regression
  if (devMode) {
    data_points.push(createVector(40, 120));
    data_points.push(createVector(76, 167));
    


  }
  
  redraw();
}

function draw() {
  background(siggan_style.colors.backgroundBeige);
  drawAxes();
  drawPoints();
  drawAnimatedPredictedPoints();
  drawOldPredictedPoints();
  if (data_points.length === 0) {
    displayInitialMessage();
  }
  if (data_points.length > 1) {
    linearRegression();
    drawLine();
    displayEquation();
  }
  if (clickCount >= 5) {
    displayHint();
  }
  if (clickCount >= 10) {
    if (opacityPointLabels > 0) {
      opacityPointLabels -= 2;
    }
  }

  if(devMode) {
    drawHintArrow();
  }
  
   
}



function mousePressed() {
  const isInsideCanvas = mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height;
  const isInsideChart = mouseX > left_margin_chart && mouseX < width - right_margin_chart && mouseY > top_margin_chart && mouseY < height - bottom_margin_chart;
  const isBelowXAxis = mouseY > height - bottom_margin_chart && mouseY < height && mouseX > left_margin_chart && mouseX < width - right_margin_chart;

  if (isInsideChart) {
    // Add a regular point
    let dataPoint = canvasToData(mouseX, mouseY);
    data_points.push(dataPoint);
    console.log(`Added point: (${dataPoint.x}, ${dataPoint.y})`);

    // Move predicted points to old predicted points and set their opacity to 42%
    old_predicted_data_points = predicted_data_points.map(pt => ({ ...pt, opacity: 42 }));
    predicted_data_points = [];

    clickCount++;
    redraw();
  }
  if (isBelowXAxis && data_points.length >= 2) {
    // Add and animate a predicted point if the user clicks below the x-axis
    console.log("Clicked below x-axis");
    let dataPoint = canvasToData(mouseX, mouseY);
    addAndAnimatePredictedPoint(dataPoint.x);
  }
  

}

function generateBaseRelationship(x) {
  return m * x + b;
}

function generateNoise(mean, standardDeviation) {
  return randomGaussian(mean, standardDeviation);
}

function calculateMean(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  return sum / data.length;
}

function calculateStandardDeviation(data, mean) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += Math.pow(data[i] - mean, 2);
  }
  return Math.sqrt(sum / data.length);
}

function estimateStandardDeviation() {
  if (data_points.length < 2) {
      return 0; // Not enough data to estimate noise
  }

  let residuals = [];
  
  for (let pt of data_points) {
      let predictedY = generateBaseRelationship(pt.x); // Get predicted Y using regression
      let residual = pt.y - predictedY; // Calculate residual
      residuals.push(residual);
  }

  let sumOfSquares = 0;
  for (let res of residuals) {
      sumOfSquares += Math.pow(res, 2);
  }
  
  // Unbiased estimator: divide by (n - 1)
  let variance = sumOfSquares / (residuals.length - 1);
  
  return Math.sqrt(variance);
}

function addAndAnimatePredictedPoint(x) {
  let Ybase = generateBaseRelationship(x);
  let std = estimateStandardDeviation();
  let eps = generateNoise(0, std);
  let Ysampled = Ybase + eps;
  let dataPoint = createVector(x, Ysampled);
  predicted_data_points.push({ point: dataPoint, progress: 0 });
  console.log(`Added predicted point: (${dataPoint.x}, ${dataPoint.y}) with noise: ${noise}`);
  clickCount++;
  redraw();
}

function drawPoints() {
  for (let i = 0; i < data_points.length; i++) {
    let pt = data_points[i];
    let canvasPoint = dataToCanvas(pt.x, pt.y);
    // Draw simple point
    if (showDataPointSimplePoint) {
      strokeWeight(8);
      stroke(0);
      point(canvasPoint.x, canvasPoint.y);
    }
    // Draw text
    if (showDataPointValues) {
      textSize(12);
      noStroke();
      textFont(fontSourceSansProRegular);
      
      textAlign(CENTER, TOP);
      // use opacity of from variable opacityPointLabels
      fill(siggan_style.colors.text80.levels[0], siggan_style.colors.text80.levels[1], siggan_style.colors.text80.levels[2],opacityPointLabels);
      text(`y: ${pt.y.toFixed(0)} cm\nx: ${pt.x.toFixed(0)} år`, canvasPoint.x, canvasPoint.y + 10);
    }
    // Draw SVG image
    imageMode(CENTER, CENTER);
    image(svgImage, canvasPoint.x, canvasPoint.y , 32, 32); // Adjust the position as needed
  }
}

easeOut = function(t, easeAmount) {
  return 1 - Math.pow(1 - t, easeAmount);
};

function drawAnimatedPredictedPoints() {
  for (let i = predicted_data_points.length - 1; i >= 0; i--) {
    let pt = predicted_data_points[i];
    let canvasPoint = dataToCanvas(pt.point.x, pt.point.y);
    let targetY = canvasPoint.y;
    let startY = height - 50; // Start below the x-axis
    let easedProgress = easeOut(pt.progress,3);
    let currentY = lerp(startY, targetY, easedProgress);
    strokeWeight(8);
    stroke(0);
    // Draw simple point
    if (showDataPointSimplePoint) {
      point(canvasPoint.x, currentY);
    }
    // Draw text
    if (showDataPointValues) {
      textSize(12);
      noStroke();
      textFont(fontSourceSansProRegular);
      // use opacity of from variable opacityPointLabels
      let numPredicted = predicted_data_points.length;
      let opacityPredicted = numPredicted > 20 ? 256 - (2.56 * (numPredicted - 20)) : 256;
      fill(siggan_style.colors.text80.levels[0], siggan_style.colors.text80.levels[1], siggan_style.colors.text80.levels[2], opacityPredicted);
      textAlign(CENTER, TOP);
      // Check if it has reached final position
      const isAnimating = pt.progress < 1;
      if (isAnimating) {
        textSize(12);
        text(`y: ?  \nx: ${pt.point.x.toFixed(0)} år`, canvasPoint.x, currentY + 10);
      }
      if (!isAnimating) {
        textSize(12);
        text(`y: ${pt.point.y.toFixed(0)} cm\nx: ${pt.point.x.toFixed(0)} år`, canvasPoint.x, canvasPoint.y + 10);
      }
    }
    // Draw SVG image
    imageMode(CENTER, CENTER);
    image(svgImage2, canvasPoint.x, currentY, 32, 32); // Adjust the position as needed
    pt.progress += predictedPointAnimationSpeed; // Adjust the speed of the animation
    if (pt.progress >= 1) {
      pt.progress = 1; // Ensure the progress does not exceed 1
    }
  }
}

function drawOldPredictedPoints() {
  // Draw the old predicted points
  for (let i = 0; i < old_predicted_data_points.length; i++) {
    let pt = old_predicted_data_points[i];
    let canvasPoint = dataToCanvas(pt.point.x, pt.point.y);
    strokeWeight(8);
    stroke(0);

    // Draw SVG image but with 42% opacity
    imageMode(CENTER, CENTER);
    tint(255, 42); // Apply transparency
    image(svgImage2, canvasPoint.x, canvasPoint.y , 32, 32); // Adjust the position as needed
    noTint(); // Remove transparency
  }
}

function linearRegression() {
  let xsum = 0;
  let ysum = 0;
  for (let pt of data_points) {
    xsum += pt.x;
    ysum += pt.y;
  }
  let xmean = xsum / data_points.length;
  let ymean = ysum / data_points.length;

  let num = 0;
  let den = 0;
  for (let pt of data_points) {
    num += (pt.x - xmean) * (pt.y - ymean);
    den += (pt.x - xmean) * (pt.x - xmean);
  }
  m = num / den;
  b = ymean - m * xmean;

  // Calculate Pearson correlation coefficient
  let xysum = 0;
  let xsqsum = 0;
  let ysqsum = 0;
  for (let pt of data_points) {
    xysum += (pt.x - xmean) * (pt.y - ymean);
    xsqsum += Math.pow(pt.x - xmean, 2);
    ysqsum += Math.pow(pt.y - ymean, 2);
  }
  correlation = xysum / Math.sqrt(xsqsum * ysqsum);
}

function calculateCorrelation() {
  let xsum = 0;
  let ysum = 0;
  let xysum = 0;
  let xsqsum = 0;
  let ysqsum = 0;
  let n = data_points.length;

  for (let pt of data_points) {
    xsum += pt.x;
    ysum += pt.y;
    xysum += pt.x * pt.y;
    xsqsum += pt.x * pt.x;
    ysqsum += pt.y * pt.y;
  }

  let numerator = n * xysum - xsum * ysum;
  let denominator = Math.sqrt((n * xsqsum - xsum * xsum) * (n * ysqsum - ysum * ysum));
  return numerator / denominator;
}

function drawLine() {
  
  let x1 = minX;
  let y1 = m * x1 + b;
  let x2 = maxX;
  let y2 = m * x2 + b;
  let canvasPoint1 = dataToCanvas(x1, y1);
  let canvasPoint2 = dataToCanvas(x2, y2);
 
  
  // If x or y is outside chart,  calculate  new point were line intercepts chart area to keep within chart
  if (y1 > maxY) {
    canvasPoint1 = dataToCanvas((maxY - b) / m, maxY);
    
  }
  if (y1 < minY) {
    canvasPoint1 = dataToCanvas((minY - b) / m, minY);
  }
  if (y2 > maxY) {
    canvasPoint2 = dataToCanvas((maxY - b) / m, maxY);
  }
  if (y2 < minY) {
    canvasPoint2 = dataToCanvas((minY - b) / m, minY);
  }

  
    if(devMode) {
    fill(0,0,256)

  
    strokeWeight(8);
    stroke(0);
    point(canvasPoint1.x, canvasPoint1.y); // Start point
    stroke(0, 255, 0);
    point(canvasPoint2.x, canvasPoint2.y); // End point
    stroke(0, 0, 255);
    point(dataToCanvas(minX, minY)); // minX and minY
    point(dataToCanvas(maxX, maxY)); // maxX and maxY
    }


  



  // Draw
  stroke(siggan_style.colors.line);
  strokeWeight(2);
  line(canvasPoint1.x, canvasPoint1.y, canvasPoint2.x, canvasPoint2.y);
}

function displayEquation() {
  fill(siggan_style.colors.text80);
  noStroke();
  textSize(24);
  textFont(heldaneFont);
  textAlign(LEFT);
  let y_pos = 30;
  let x_pos = 80;
  let vMargin = 30;
  text(`y = mX + b`, x_pos, y_pos);
  text(`m = ${m.toFixed(2)}`, x_pos, y_pos + vMargin * 1);
  text(`b = ${b.toFixed(2)}`, x_pos, y_pos + vMargin * 2);
  text(`r = ${correlation.toFixed(2)}`, x_pos, y_pos + vMargin * 3); // Display the Pearson correlation coefficient
}

function displayInstructions() {
  fill(0);
  noStroke();
  textSize(16);
  textAlign(CENTER);
}

function displayInitialMessage() {
  fill(siggan_style.colors.text);
  textAlign(CENTER);
  textSize(20);
  textFont(heldaneFont); // Use the Heldane Display font
  text(initialMessage, width / 2, height / 2);
}

function drawHintArrow() {
  console.log("drawHintArrow");
  

 

  if(devMode) {
     // display curved arrow around 70% of width and a little above the x-axis, pointing as a hint down to click below x-axis
  // use a bezier curve to draw the arrow
  let x1 = width * 0.7;
  let y1 = height - 50;
  let x2 = width * 0.7 + 20;
  let y2 = height - 50 + 20;
  let x3 = width * 0.7 - 20;
  let y3 = height - 50 + 20;
  let x4 = width * 0.7;
  let y4 = height - 50 + 40;

   // Draw the start point in black, end point in green and control points in red
  strokeWeight(8);
  stroke(0);
  point(x1, y1);
  stroke(0, 255, 0);
  point(x4, y4);
  stroke(255, 0, 0);
  point(x2, y2);
  point(x3, y3);
  cd
  
  


    
  }
  // draw the arrow
  stroke(siggan_style.colors.line);
  strokeWeight(2);
  noFill();
  bezier(x1, y1, x2, y2, x3, y3, x4, y4);
  // draw the arrow head
  let arrowSize = 10;
  let angle = PI / 6;
  let x5 = x4 + arrowSize * cos(angle);
  let y5 = y4 + arrowSize * sin(angle);
  let x6 = x4 - arrowSize * cos(angle);
  let y6 = y4 + arrowSize * sin(angle);
  stroke(siggan_style.colors.line);
  strokeWeight(2);
  line(x4, y4, x5, y5);
  line(x4, y4, x6, y6);


}

function displayHint() {
  // Display orange bean
  
  
  if (frameCount % 30 < 15) { // Blink every quarter second
    fill(siggan_style.colors.text);  
  }

  // Display hint text
  textAlign(CENTER, CENTER);
    textSize(20);
    textFont(heldaneFont); // Use the Heldane Display font
    fill(siggan_style.colors.line);
    text("Klicka här under x-axeln för att predicera y-värden" , width / 2, height - (bottom_margin_chart / 2));
}

function drawAxes() {
  textFont(heldaneFont);
  textSize(16);
  stroke(150);
  strokeWeight(1);
  line(left_margin_chart, top_margin_chart, left_margin_chart, height - bottom_margin_chart); // y-axis
  line(left_margin_chart, height - bottom_margin_chart, width - right_margin_chart, height - bottom_margin_chart); // x-axis

  fill(siggan_style.colors.text80);
  noStroke();
  textAlign(CENTER);
  push();
  translate(25, height / 2);
  rotate(-HALF_PI);
  text(y_axis_label, 0, 0);
  pop();
  textAlign(CENTER, TOP);
  text(x_axis_label, width / 2, height - bottom_margin_chart + 10);
}

function wrapText(text, maxWidth) {
  let words = text.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    let word = words[i];
    let width = textWidth(currentLine + ' ' + word);
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines.join('\n');
}

function dataToCanvas(x, y) {
  let x_pos = map(x, minX, maxX, left_margin_chart, width - right_margin_chart);
  let y_pos = map(y, minY, maxY, height - bottom_margin_chart, top_margin_chart);
  return createVector(x_pos, y_pos);
}

function canvasToData(x_pos, y_pos) {
  let x = map(x_pos, 50, width - 50, minX, maxX);
  let y = map(y_pos, height - 50, 50, minY, maxY);
  return createVector(x, y);
}
