

function Flat (array : Array<number | string | Object>){
    var flatArr: any[] = []
    array.map((item : any)=>{
        if(item instanceof Array){
            flatArr.push(...Flat(item))
        } else {
            flatArr.push(item)
        }
    })

    return flatArr
}

const result =  Flat([1,[2,3,4],5,7,[6,[9,10]]])

console.log(result)