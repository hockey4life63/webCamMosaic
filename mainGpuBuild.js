// const Webcam = require('webcamjs')
const gpu = new GPU()
const tileSize = 32

// Webcam.set({
//     width: 640,
//     height: 480,
//     dest_width: 640,
//     dest_height: 480,
// });

// Webcam.attach('#my_camera');


// function takeFullSizeSnap() {
//     return new Promise(resolve => {
//         Webcam.snap(function(data_uri, canvas, pixels) {
//             resolve({canvas, data_uri, pixels})
//         });
//     })
// }

const width = 640
const height = 480
const currentTileDiff = new Array((width/tileSize)*(height/tileSize)).fill(1)

const compareAllTiles = gpu.createKernel(function(targetTile, testTile, globals){
    let x = this.thread.y/globals[0]
    let y = this.thread.y%globals[0]
    let targetX = this.thread.x*globals[0]
    let targetY = this.thread.x%globals[1]
    let r = targetTile[targetX][targetY][0]-testTile[x][y][0]
    let g = targetTile[targetX][targetY][1]-testTile[x][y][1]
    let b = targetTile[targetX][targetY][2]-testTile[x][y][2]
    return Math.sqrt((r*r)+(g*g)+(b*b))
}).setOutput({x:tileSize*tileSize, y:(width/tileSize)*(height/tileSize)})

const compareTile = gpu.createKernel(function(targetTile, testTile, tileSize){
    let x = this.thread.x/tileSize[0]
    let y = this.thread.x%tileSize[0]
    let r = targetTile[x][y][0]-testTile[x][y][0]
    let g = targetTile[x][y][1]-testTile[x][y][1]
    let b = targetTile[x][y][2]-testTile[x][y][2]
    return Math.sqrt((r*r)+(g*g)+(b*b))
}).setOutput([tileSize*tileSize])

const quantifyPerTileDiff = gpu.createKernel(function(testTileDiff){
    let sum = 0
    for (var i = 0; i < this.constants.loopMax; i++) {
        sum += testTileDiff[this.thread.x][i]
    }
    return sum
},{
    output:[(width/tileSize)*(height/tileSize)],
    constants:{loopMax:tileSize*tileSize}
})

const compareDiff = gpu.createKernel(function(testTileDiff, currentTileDiff){
    return testTileDiff[this.thread.x] - currentTileDiff[this.thread.x]
}).setOutput([(width/tileSize)*(height/tileSize)])

const getBetterTileLocations = gpu.createKernel(`function(testDIff){
    if(testDIff[this.thread.x] > 0){
        return 1
    } else{
        return 0
    }
}`).setOutput([(width/tileSize)*(height/tileSize)])

const updateCurrentTileDiff = gpu.createKernel(`function(currentTileDiff, testTileDiff, indices){
    if(indices[this.thread.x] === 1){
        return testTileDiff[this.thread.x]
    } else{
        return currentTileDiff[this.thread.x]
    }
}`).setOutput([(width/tileSize)*(height/tileSize)])

const tileCompare = gpu.combineKernels(compareAllTiles, quantifyPerTileDiff, compareDiff, getBetterTileLocations, function(targetImage, sourceTile, currentTileDiff, globals){
    getBetterTileLocations(compareDiff(quantifyPerTileDiff(compareAllTiles(targetImage, sourceTile, globals)), currentTileDiff))
})
// let tileComparesion = compareAllTiles(GPU.input(new Float32Array(width*height*4).fill(2), [height, width, 4]),
//      GPU.input(new Float32Array(tileSize*tileSize*4).fill(2), [tileSize, tileSize, 4])
//      , [tileSize, width])
// let testTileDiff = quantifyPerTileDiff(tileComparesion)
// let diffcompareRes = compareDiff(testTileDiff, currentTileDiff)
// let betterLoc = getBetterTileLocations(diffcompareRes)
// let newCurrentDiff = updateCurrentTileDiff(currentTileDiff, testTileDiff, betterLoc)
// console.log(betterLoc, newCurrentDiff)
console.log(tileCompare(
    GPU.input(new Float32Array(width*height*4).fill(2), [height, width, 4]),
     GPU.input(new Float32Array(tileSize*tileSize*4).fill(2), [tileSize, tileSize, 4])
     ,currentTileDiff, [tileSize, width]
    ))

// Webcam.on('load', () => {
       
// })
