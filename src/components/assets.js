import axios from 'axios'
import { id } from 'ethers/lib/utils'
import React, { Component } from 'react'
import { createClient } from 'urql'
import { UngrundContext } from '../context/UngrundContext'
import { Document, Page, pdfjs } from 'react-pdf/dist/esm/entry.webpack'
import ReactMarkdown from 'react-markdown'

const _ = require('lodash')

function toHex(d) {
    return (Number(d).toString(16)).slice(-2).toUpperCase()
}

const assets = async (address) => {
    console.log(assets)
    const APIURL = "https://api.thegraph.com/subgraphs/name/crzypatchwork/ungrund"
    const tokensQuery = `query
    {
        assets(where: { from : "${address}", available_not : "0", mimeType_not : "" }, orderBy: timestamp,  orderDirection: desc) {
                  id
                  mimeType
                  image
                  animation
                  metadata
                  from
                  timestamp
        }
    }`

    const client = createClient({
        url: APIURL
    });

    const data = await client.query(tokensQuery).toPromise();
    return data.data.assets

}

const collection = async (address, creations) => {

    const APIURL = "https://api.thegraph.com/subgraphs/name/crzypatchwork/ungrund"

    const from = `query
    {
        transfers(where: { from : "${address}" }) {
                  id
                  value
                  from
                  tokenId
                  to
        }
    }`

    const to = `query
    {
        transfers(where: { to : "${address}" }) {
                  id
                  value
                  tokenId
                  from
                  to
        }
    }`

    const client = createClient({
        url: APIURL
    });


    let _out = (await client.query(from).toPromise()).data.transfers
    let _in = (await client.query(to).toPromise()).data.transfers

    // remove creations

    //let x0 = _in.filter(e => e.from == "0x0000000000000000000000000000000000000000")

    _in = _in.filter(e => e.from != "0x0000000000000000000000000000000000000000" && !creations.map(e => e.id).includes(e.tokenId))

    _in.map(e => e.value = Number(e.value))
    console.log(_in)
    //this.setState({ arr : _in })
    //let id_in = _.uniqBy(_in.map(e => Number(e.tokenId)), 'tokenId')
    _out.map(e => e.value = Number(e.value))
    //let id_out = _.uniqBy(_out.map(e => Number(e.tokenId)), 'tokenId')
    console.log(_out)
    // filter market/burn/secondary

    //let balance_in = _in.map(i => { return ({ id: i.tokenId, count: _.sumBy(_in.filter(j => i.tokenId == j.tokenId), 'value') }) })
    //let balance_out = _out.map(i => { return ({ id: i.tokenId, count: _.sumBy(_out.filter(j => i.tokenId == j.tokenId), 'value') }) })
    //console.log(balance_in, balance_out)

    // unique by
    //balance_in = _.uniqBy(balance_in, 'id')
    //balance_out = _.uniqBy(balance_out, 'id')

    //let collection = balance_in.map(i => balance_out.map(j => {
    //    if (i.id === j.id) { if (j.count - i.count != 0) console.log(j.id); return { id: j.id, amount: j.count - i.count }; }
    //}))
    //console.log(collection)
    //_out = _out.filter(e => e._to != '0x50a173157dc0627e0e9866e3804036764808ce8b')
    //_in.map(i => i.map(j => { if (i._id == j._id) i}))

    //_out.map(i => { _in.forEach(j => { if (i._id == j._id) i._value = i._value - j._value }) })
    //let data = [..._in, ..._out]
    //console.log(_in, _out)
    //data = data.filter(e => e._from != "0x0000000000000000000000000000000000000000")
    //console.log(data)


    let id_in = _in.map(e => e.tokenId)
    // in - out + on sale
    console.log(JSON.stringify(id_in))
    const metadata = `query
    {
        assets ( where : { id_in : ${JSON.stringify(id_in)}, mimeType_not : "" }, orderBy: timestamp,  orderDirection: desc) {
          metadata
          id
          animation
        mimeType
          image
        }
    }`

    return (await client.query(metadata).toPromise()).data.assets

}

const getID = async (id) => {
    const APIURL = "https://api.thegraph.com/subgraphs/name/crzypatchwork/ungrund"
    console.log(id)
    const transfers = `query
    {
        ungrundIDs (where: { id : "${id}" }) {
                  id
                  metadata
                  description
                  ungrundId
        }
    }`

    const client = createClient({
        url: APIURL
    });


    let res = (await client.query(transfers).toPromise()).data
    return res.ungrundIDs[0]
}

export class Assets extends Component {

    static contextType = UngrundContext

    state = {
        loading: true,
        creations: [],
        collection: [],
        arr: [],
        id: undefined,
        description: undefined
    }

    componentWillMount = async () => {

        var aux = await assets(window.location.hash.split('/')[1])
        var id = await getID(window.location.hash.split('/')[1])
        this.setState({ id : id?.ungrundId ? id.ungrundId : undefined , description : id?.description ? id.description : undefined })

        aux = await aux.map(async e => {
            if (e.mimeType?.split('/')[0] == 'text') e.text = await axios.get(`https://ipfs.io/ipfs/${e.image.split('//')[1]}`).then(res => res.data)
            return e
        })

        Promise.all(aux).then(values => {
            console.log(values)
            this.setState({ arr: values, creations: values, loading: false })
        })

    }

    setAssets = async (id) => {
        this.setState({ loading : true })

        let aux = await assets(id)

        aux = await aux.map(async e => {
            if (e.mimeType?.split('/')[0] == 'text') e.text = await axios.get(`https://ipfs.io/ipfs/${e.image.split('//')[1]}`).then(res => res.data)
            return e
        })

        Promise.all(aux).then(values => {
            this.setState({ arr: values, loading: false })
        })

    }

    setCollection = async (id) => {
        this.setState({ loading : true })

        let aux = await collection(id, this.state.creations)
        
        aux = await aux.map(async e => {
            if (e.mimeType?.split('/')[0] == 'text') e.text = await axios.get(`https://ipfs.io/ipfs/${e.image.split('//')[1]}`).then(res => res.data)
            return e
        })

        Promise.all(aux).then(values => {
            this.setState({ arr: values, loading: false })
        })

    }   

    render() {
        return (
            <div><br />
                { this.state.id ?
                <span><a class="style" href={`https://polygonscan.com/address/${window.location.hash.split('/')[1]}`}>{this.state.id}</a><span> {this.state.description}</span></span>
                :
                <a class="style" href={`https://polygonscan.com/address/${window.location.hash.split('/')[1]}`}>{window.location.hash.split('/')[1].slice(0, 7)}...{window.location.hash.split('/')[1].slice(36, 42)}</a>
                }
                <div>
                    {
                        !this.state.loading ?
                            <div>
                                <div>
                                    <a class="style" style={{cursor : 'pointer'}} onClick={() => this.setAssets(window.location.hash.split('/')[1])}>//creations //</a>
                                    <a class="style" style={{cursor : 'pointer'}} onClick={() => this.setCollection(window.location.hash.split('/')[1])}>collection //</a>
                                </div>
                                <div class="row">
                                {
                                    this.state.arr.map(e => {
                                        {
                                                return (
                                                    <div class="column">
                                                        {
                                                            e.mimeType?.split('/')[0] == 'image' ?
                                                                <a href={`#/asset/${toHex(e.id)}`}>
                                                                    <img variant="top" src={`https://cloudflare-ipfs.com/ipfs/${e.image.split('//')[1]}`} />
                                                                </a>
                                                                :
                                                                undefined
                                                        }
                                                        {
                                                            e.mimeType?.split('/')[0] == 'text' ?
                                                                <div class='txt' style={{ maxWidth: '50vw' }}>
                                                                    <a class='nostyle' href={`#/asset/${toHex(e.id)}`}>
                                                                        <ReactMarkdown>
                                                                            {e.text}
                                                                        </ReactMarkdown>
                                                                    </a>
                                                                </div>
                                                                : undefined
                                                        }
                                                        {
                                                            e.mimeType?.split('/')[0] == 'video' ?
                                                            <div>
                                                                <a href={`#/asset/${toHex(e.id)}`}>
                                                                    <video autoPlay={"autoplay"} loop muted style={{ maxWidth : '50vw' }}>
                                                                        <source src={`https://ipfs.io/ipfs/${e.animation.split('//')[1]}`}></source>
                                                                    </video>
                                                                </a>
                                                            </div> : undefined
                                                        }
                                                        {
                                                            e.mimeType?.split('/')[0] == 'audio' ?
                                                            <div>
                                                                <a href={`#/asset/${toHex(e.id)}`}>
                                                                    <img src={`https://ipfs.io/ipfs/${e.image.split('//')[1]}`} />
                                                                    <audio controls>
                                                                        <source src={`https://ipfs.io/ipfs/${e.animation.split('//')[1]}`}/>
                                                                    </audio>
                                                                </a>
                                                            </div> : undefined
                                                        }                                                                
                                                        {
                                                                    e.mimeType == 'application/pdf' ?
                                                                        <div>
                                                                            <a href={`#/asset/${toHex(e.id)}`}>
                                                                                <Document
                                                                                    file={`https://cloudflare-ipfs.com/ipfs/${e.image.split('//')[1]}`}
                                                                                >
                                                                                    <Page pageNumber={1} />
                                                                                </Document>
                                                                            </a>
                                                                        </div>
                                                                        : undefined
                                                                }
                                                    </div>
                                                )
                                        }
                                    })
                                }
                                </div>
                            </div>
                            :
                            undefined
                    }
                </div>
            </div>
        )
    }
}