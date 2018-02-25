const gpu = new GPU()
let tileSize = 16
let timePerFrame = 1000/30
let runTime = 60
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
const mosaicCanvas = document.getElementById('mainCanvas')
const mosaicCtx = mosaicCanvas.getContext('2d')
const thumbnailCanvas = document.getElementById('resultsThumbnail')
const thumbnailCtx = thumbnailCanvas.getContext('2d')
let targetImageData = null

let targetImage;
let currentTileDiff = new Array((width / tileSize) * (height / tileSize)).fill(10000)

const compareAllTiles = gpu.createKernel(function(targetImage, testTile) {
    let xTileIndex = this.thread.x % this.constants.tiledWidth
    let yTileIndex = Math.floor(this.thread.x / this.constants.tiledWidth)
    let targetX = xTileIndex*this.constants.tileSize
    let targetY = yTileIndex*this.constants.tileSize
    let sum = 0
    let startingIndex = targetY*this.constants.width+targetX
    for (let row = 0; row < this.constants.tileSize; row++) {
            for (let col = 0; col < this.constants.tileSize; col++) {
                let r = targetImage[4*(startingIndex+(row*this.constants.width+col))] - testTile[4*(row*this.constants.tileSize+col)]
                let g = targetImage[4*(startingIndex+(row*this.constants.width+col))+1] - testTile[4*(row*this.constants.tileSize+col)+1]
                let b = targetImage[4*(startingIndex+(row*this.constants.width+col))+2] - testTile[4*(row*this.constants.tileSize+col)+2]
                sum+=abs(r)+abs(g)+abs(b)
            }
        }
        return sum/(tileSize*tileSize)
}, {
    output:[(width / tileSize) * (height / tileSize) ],
    constants:{tileSize, width, tiledWidth},
})

// const compareImageAndTIle = (targetImage, testTile)=>{
//     let testArr = new Array(tiledHeight*tiledWidth).fill(0)
//     console.log
//     let diffArr = testArr.map((ele, index)=>{
//         let xTileIndex = index % tiledWidth
//         let yTileIndex = Math.floor(index / tiledWidth)
//         let targetX = xTileIndex*tileSize
//         let targetY = yTileIndex*tileSize
//         let startingIndex = targetY*width+targetX
//         let sum =0
//         for (let row = 0; row < tileSize; row++) {
//             for (let col = 0; col < tileSize; col++) {
//                 let r = targetImage[4*(startingIndex+(row*width+col))] - testTile[4*(row*tileSize+col)]
//                 let g = targetImage[4*(startingIndex+(row*width+col))+1] - testTile[4*(row*tileSize+col)+1]
//                 let b = targetImage[4*(startingIndex+(row*width+col))+2] - testTile[4*(row*tileSize+col)+2]
//                 // if(col === 0)console.log(startingIndex+(row*width+col) > 1228800, startingIndex)
//                 sum+=Math.sqrt(Math.pow(r, 2)+Math.pow(g, 2)+Math.pow(b, 2))
//             }
//         }
//         return Math.sqrt(sum)

//     })
//     return diffArr    
// }


const startMosaic = _ => {
    targetImageCtx.drawImage(video, 0, 0)
    targetImageObj = targetImageCtx.getImageData(0,0,width, height)
    targetImageData = targetImageObj.data
    document.getElementById('targetCanvas').getContext('2d').drawImage(targetImageCanvas, 0, 0)
    let counter = 0
    let frameGrabInterval = setInterval(async() => {
        counter++
        if (counter > 60) {
            clearInterval(frameGrabInterval)
            alert('ended!')
        }
        hiddenTileCtx.drawImage(video, 0, 0, tileSize, tileSize)
        let tileImageDataObj = hiddenTileCtx.getImageData(0,0,tileSize, tileSize)
        let tileImageData = tileImageDataObj.data
        let tileComparison = compareAllTiles(Array.from(targetImageData),Array.from(tileImageData))
        tileComparison = Array.from(tileComparison).forEach((ele, index)=>{
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

const takePicture = _=>{
    targetImageCtx.drawImage(video, 0, 0)
    const targetImageObj = targetImageCtx.getImageData(0,0,width, height)
    const targetImageData = targetImageObj.data
    document.getElementById('targetCanvas').getContext('2d').drawImage(targetImageCanvas, 0, 0)
    return targetImageData
}

const startMosaicBuilder = (videoEle, mosaicCtx, targetImageData)=>{
    console.log(timePerFrame, 1000/timePerFrame)
    let counter = 0
    targetImageData = Array.from(targetImageData)
    const frameGrabInterval = setInterval(async() => {
        counter++
        if (counter > runTime * (1000/timePerFrame)){
            clearInterval(frameGrabInterval)
            thumbnailCtx.drawImage(mosaicCanvas, 0, 0, width*0.25, height*0.25)
            alert('ended!')
        }
        hiddenTileCtx.drawImage(videoEle, 0, 0, tileSize, tileSize)
        let tileImageDataObj = hiddenTileCtx.getImageData(0,0,tileSize, tileSize)
        let tileImageData = tileImageDataObj.data
        let tileComparison = compareAllTiles(targetImageData,Array.from(tileImageData))
        tileComparison = Array.from(tileComparison).forEach((ele, index)=>{
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
    }, timePerFrame)
}

video.addEventListener('canplay', function(ev) {
    if (!streaming) {
        video.setAttribute('width', width);
        video.setAttribute('height', height);
        targetImageCanvas.width = width
        targetImageCanvas.height = height
        mosaicCanvas.width = width
        mosaicCanvas.height = height
        thumbnailCanvas.width = width
        thumbnailCanvas.height = height
        streaming = true;
        document.getElementById('takePicture').addEventListener('click', e=>{
            e.preventDefault()
            targetImageData = takePicture()
        })
        document.getElementById('start').addEventListener('click', function(e){
            e.preventDefault()
            currentTileDiff = new Array((width / tileSize) * (height / tileSize)).fill(10000)
            mosaicCtx.clearRect(0,0, mosaicCanvas.width, mosaicCanvas.height)
            thumbnailCtx.clearRect(0,0, thumbnailCanvas.width, thumbnailCanvas.height)
            runTime = document.getElementById('runTimeInput').value
            startMosaicBuilder(video, mosaicCtx, targetImageData)
            this.disabled = true
            document.getElementById('takePicture').disabled = true
            setTimeout(function(){
                document.getElementById('takePicture').disabled = false
                document.getElementById('start').disabled = false

            }, runTime * 1000)

        })
    }
}, false)

navigator.getUserMedia({ video: true, audio: false }, stream => {
    video.srcObject = stream
    timePerFrame = 1000/(stream.getVideoTracks()[0].getSettings().frameRate || 30)
    video.play()
}, err => {
    if(err)throw err
})
