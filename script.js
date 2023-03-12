const canvas = document.querySelector('#canvas1')
const cursor = document.querySelector('#cursor')
const ctx = canvas.getContext('2d')
canvas.width = window.innerWidth
canvas.height = window.innerHeight
let canvasWidth = canvas.width
let canvasHeight = canvas.height
let particleArray = []
let imageData = []
let raqID = null // Cancel current requestAnimationFrame upon resize

// mouse
let mouse = {
  x: null,
  y: null,
  radius: 40
}

// Devices with mouse
window.addEventListener('mousemove', e => {
  cursor.style.opacity = 1
  mouse.x = e.x
  mouse.y = e.y
  cursor.style.transform = `translate(${e.x}px, ${e.y}px)`
})

window.addEventListener('mouseup', e => {
  cursor.style.opacity = 0
  mouse.x = null
  mouse.y = null
})

// For touch devices
document.body.addEventListener('mouseleave', e => {
  cursor.style.opacity = 0
  mouse.x = null
  mouse.y = null
})

window.addEventListener('touchstart', e => {
  mouse.x = e.touches[0].clientX
  mouse.y = e.touches[0].clientY
})

window.addEventListener('touchmove', e => {
  mouse.x = e.changedTouches[0].clientX
  mouse.y = e.changedTouches[0].clientY
})

window.addEventListener('touchend', e => {
  cursor.style.opacity = 0
  mouse.x = null
  mouse.y = null
})

// Draw image on canvas and run animation
function drawImage(width, height) {
  let imageWidth = width
  let imageHeight = height
  const data = ctx.getImageData(0, 0, imageWidth, imageHeight)
  
  class Particle {
    constructor(x, y, color, size = 2) {
      this.x = Math.round(x + canvas.width / 2 - imageWidth / 2)
      this.y = Math.round(y + canvas.height / 2 - imageHeight / 2)
      this.color = color
      this.size = size
      
      // Records base and previous positions to repaint the canvas to its original background color
      this.baseX = Math.round(x + canvas.width / 2 - imageWidth / 2)
      this.baseY = Math.round(y + canvas.height / 2 - imageHeight / 2)
      this.previousX = null
      this.previousY = null
      this.density = (Math.random() * 100) + 2
    }
    
    stringifyColor() {
      return `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.color.a}`
    }
    
    update() {
      ctx.fillStyle = this.stringifyColor()
      
      // collision detection
      let dx = mouse.x - this.x
      let dy = mouse.y - this.y
      let distance = Math.sqrt(dx * dx + dy * dy)
      let forceDirectionX = dx / distance
      let forceDirectionY = dy / distance
      
      // Max distance, past that the force will be 0
      const maxDistance = mouse.radius * 2.5
      let force = (maxDistance - distance) / maxDistance
      if (force < 0) force = 0
      
      let directionX = (forceDirectionX * force * this.density)
      let directionY = (forceDirectionY * force * this.density)
      
      this.previousX = this.x
      this.previousY = this.y
      if (distance < mouse.radius + this.size) {
        this.x -= directionX
        this.y -= directionY
      } else {
      	// Rounded to one decimal number to as x and y cannot be the same (whole decimal-less integer) 
      	// as baseX and baseY by decreasing using a random number / 20
        if (Math.round(this.x) !== this.baseX) {
          let dx = this.x - this.baseX
          this.x -= dx / 20
        }
        if (Math.round(this.y) !== this.baseY) {
          let dy = this.y - this.baseY
          this.y -= dy / 20
        }
      }
    }
  }
  
  function createParticle(x, y, size) {
    let positionX = x
    let positionY = y
    let offset = (y * 4 * data.width) + (x * 4)
    let color = {
      r: data.data[offset],
      g: data.data[offset + 1],
      b: data.data[offset + 2],
      a: data.data[offset + 3]
    }

    return new Particle(positionX, positionY, color, size)
  }
  
  // Instead of drawing each Particle one by one, construct an ImageData that can be
  // painted into the canvas at once using putImageData()
  function updateImageDataWith(particle) {
    let x = particle.x
    let y = particle.y
    let prevX = particle.previousX
    let prevY = particle.previousY
    let size = particle.size

    if (prevX || prevY) {
      let prevMinY = Math.round(prevY - size)
      let prevMaxY = Math.round(prevY + size)
      let prevMinX = Math.round(prevX - size)
      let prevMaxX = Math.round(prevX + size)

      for (let y = prevMinY; y < prevMaxY; y++){
        for (let x = prevMinX; x < prevMaxX; x++) {
          if (y < 0 || y > canvasHeight) continue
          else if (x < 0 || x > canvasWidth) continue
          else {
            let offset = y * 4 * canvasWidth + x * 4
            imageData.data[offset] = 255
            imageData.data[offset + 1] = 207
            imageData.data[offset + 2] = 214
            imageData.data[offset + 3] = 255
          }
        }
      }
    }

    let minY = Math.round(y - size) 
    let maxY = Math.round(y + size) 
    let minX = Math.round(x - size) 
    let maxX = Math.round(x + size) 

    for (let y = minY; y < maxY; y++){
      for (let x = minX; x < maxX; x++) {
        if (y < 0 || y > canvasHeight) continue
        else if (x < 0 || x > canvasWidth) continue
        else {
          let offset = y * 4 * canvasWidth + x * 4
          imageData.data[offset] = particle.color.r
          imageData.data[offset + 1] = particle.color.g
          imageData.data[offset + 2] = particle.color.b
          imageData.data[offset + 3] = particle.color.a
        }
      }
    }
  }
  
  function init() {
    particleArray = []
    imageData = ctx.createImageData(canvasWidth, canvasHeight)
    mouse.radius = Math.round(Math.sqrt(imageWidth * imageHeight) / 10)
      
    // Initializing imageData to a blank pink "page" (rgba(255, 207, 214, 255))
    for (let data = 1; data <= canvasWidth * canvasHeight * 4; data++) {
      if (data % 4 === 1) imageData.data[data - 1] = 255
      else if (data % 4 === 2) imageData.data[data - 1] = 207
      else if (data % 4 === 3) imageData.data[data - 1] = 214
      else if (data % 4 === 0) imageData.data[data - 1] = 255
    }
    
    // Create particles and adjust imageData to paint each particle's pixel value
    const size = Math.round(Math.sqrt(imageWidth * imageHeight) / 75)
    const step = size // Increase to add space between pixel and make it more pixelated
    for (let y = 0, y2 = data.height; y < y2; y += step) {
      for (let x = 0, x2 = data.width; x < x2; x += step) {
        // If particle's alpha value is too low, don't record it
        if (data.data[(y * 4 * data.width) + (x * 4) + 3] > 128) {
          let newParticle = createParticle(x, y, size)
          particleArray.push(newParticle)
          updateImageDataWith(newParticle)
        }
      }
    }
  }
  
  function animate() {
    raqID = requestAnimationFrame(animate)
    
    // Repainting per frame
    for (let i = 0; i < particleArray.length; i++) {
      particleArray[i].update()
      updateImageDataWith(particleArray[i])
    }
    ctx.putImageData(imageData, 0, 0)
  }
  
  init()
  animate()
}

const png = new Image()
png.src = " data:image/png;base64,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"

function adjustImageAndCallAnimation() {
  let pngWidth = png.width
  let pngHeight = png.height
  
  // Maintaining aspect ratio and resizing image
  let divisor = pngWidth / (canvasWidth * 0.7) > pngHeight / (canvasHeight * 0.7) ? pngWidth / (canvasWidth * 0.7) : pngHeight / (canvasHeight * 0.7)
  let finalWidth = pngWidth / divisor
  let finalHeight = pngHeight / divisor
  
  ctx.drawImage(png, 0, 0, finalWidth, finalHeight)
  drawImage(finalWidth, finalHeight)
}

window.addEventListener('load', adjustImageAndCallAnimation)

// Cancelling previous raq and readjusting canvas size
let handleResize = false
let changeHandleResizeStatus = null
window.addEventListener('resize', e => {
  if (!changeHandleResizeStatus) {
    clearTimeout(changeHandleResizeStatus)
  }
  
  changeHandleResizeStatus = setTimeout(() => {
    handleResize = true
  }, 250)
  
  if (handleResize) {
    window.cancelAnimationFrame(raqID)
    canvas.width = innerWidth
    canvas.height = innerHeight
    canvasWidth = innerWidth
    canvasHeight = innerHeight

    adjustImageAndCallAnimation()
  }
})