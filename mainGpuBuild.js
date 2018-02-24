// const Webcam = require('webcamjs')
// const gpu = new GPU()
const tileSize = 16
const video = document.getElementById('cameraFeed')
let streaming = false
let width = 640
let height = 480
let tiledHeight = Math.floor(height/tileSize)
let tiledWidth = Math.floor(width/tileSize)
width = tiledWidth*tileSize
height = tiledHeight*tileSize
const targetImageCanvas = document.createElement('canvas')
const targetImageCtx = targetImageCanvas.getContext('2d')
const hiddenTileCanvas = document.createElement('canvas')
const hiddenTileCtx = hiddenTileCanvas.getContext('2d')
const mosiacCanvas = document.getElementById('mainCanvas')
const mosaicCtx = mosiacCanvas.getContext('2d')
let targetImageData = null

let targetImage;
let currentTileDiff = new Array((width / tileSize) * (height / tileSize)).fill(10000)

// const compareAllTiles = gpu.createKernel(function(targetImage, testTile) {
//     let xTileIndex = this.thread.x % this.constants.tiledWidth
//     let yTileIndex = Math.floor(this.thread.x / this.constants.tiledWidth)
//     let targetX = xTileIndex*this.constants.tileSize*4
//     let targetY = yTileIndex*this.constants.tileSize*4
//     let sum = 0
//     let startingIndex = targetY*this.constants.width*4+targetX
//     for (let col = 0; col < this.constants.tileSize*4; col+=4) {
//         for (let row = 0; row < this.constants.tileSize*4; row+=4) {
//             let r = targetImage[startingIndex+(row*this.constants.width+col*4)] - testTile[row*this.constants.tileSize+col*4]
//             let g = targetImage[startingIndex+(row*this.constants.width+col*4)+1] - testTile[row*this.constants.tileSize+col*4+1]
//             let b = targetImage[startingIndex+(row*this.constants.width+col*4)+2] - testTile[row*this.constants.tileSize+col*4+2]
//             sum+=abs(r)+abs(g)+abs(b)
//         }
//     }
//     sum = sum/(this.constants.tileSize*this.constants.tileSize)
//     return floor(sum+0.5)
// }, {
//     output:[(width / tileSize) * (height / tileSize) ],
//     constants:{tileSize, width, tiledWidth, tiledHeight},
// })


// const compareDiff = gpu.createKernel(function(testTileDiff, currentTileDiff){
//     return currentTileDiff[this.thread.x] - testTileDiff[this.thread.x] 
// }, {
//     output:[(width / tileSize) * (height / tileSize) ],
// })

const compareImageAndTIle = (targetImage, testTile)=>{
    let testArr = new Array(tiledHeight*tiledWidth).fill(0)
    console.log
    let diffArr = testArr.map((ele, index)=>{
        let xTileIndex = index % tiledWidth
        let yTileIndex = Math.floor(index / tiledWidth)
        let targetX = xTileIndex*tileSize
        let targetY = yTileIndex*tileSize
        let startingIndex = targetY*width+targetX
        let sum =0
        for (let row = 0; row < tileSize; row++) {
            for (let col = 0; col < tileSize; col++) {
                let r = targetImage[4*(startingIndex+(row*width+col))] - testTile[4*(row*tileSize+col)]
                let g = targetImage[4*(startingIndex+(row*width+col))+1] - testTile[4*(row*tileSize+col)+1]
                let b = targetImage[4*(startingIndex+(row*width+col))+2] - testTile[4*(row*tileSize+col)+2]
                // if(col === 0)console.log(startingIndex+(row*width+col) > 1228800, startingIndex)
                sum+=Math.sqrt(Math.pow(r, 2)+Math.pow(g, 2)+Math.pow(b, 2))
            }
        }
        return Math.sqrt(sum)

    })
    return diffArr    
}


const startMosaic = _ => {
    targetImageCtx.drawImage(video, 0, 0)
    targetImageObj = targetImageCtx.getImageData(0,0,width, height)
    targetImageData = targetImageObj.data
    document.getElementById('targetCanvas').getContext('2d').drawImage(targetImageCanvas, 0, 0)
    let counter = 0
    console.log(width,height)
    let frameGrabInterval = setInterval(async() => {
        counter++
        if (counter > 60) {
            clearInterval(frameGrabInterval)
            alert('ended!')
        }
        hiddenTileCtx.drawImage(video, 0, 0, tileSize, tileSize)
        let tileImageDataObj = hiddenTileCtx.getImageData(0,0,tileSize, tileSize)
        let tileImageData = tileImageDataObj.data
        let tileComparesion = compareImageAndTIle(Array.from(targetImageData),Array.from(tileImageData))
        // let diffcompareRes = compareDiff(tileComparesion, currentTileDiff.slice())
        // console.log(diffcompareRes)
        // console.log(counter, tileComparesion)
        tileComparesion = Array.from(tileComparesion).forEach((ele, index)=>{
            if(index == 0)console.log('loopStarted')
            let tileImageData = hiddenTileCanvas
            if(ele < currentTileDiff[index] ){
                let xTileIndex = index % tiledWidth
                let yTileIndex = Math.floor(index / tiledWidth)
                let targetX = xTileIndex*tileSize
                let targetY = yTileIndex*tileSize
                mosaicCtx.drawImage(tileImageData, targetX, targetY)
                currentTileDiff[index] = ele
                return 1
            } else{
                return 0
            }
        })
    }, 1000)
}

video.addEventListener('canplay', function(ev) {
    if (!streaming) {
        video.setAttribute('width', width);
        video.setAttribute('height', height);
        targetImageCanvas.width = width
        targetImageCanvas.height = height
        startMosaic()
        streaming = true;
    }
}, false)

navigator.getUserMedia({ video: true, audio: false }, stream => {
    video.srcObject = stream
    video.play()
}, err => {

})