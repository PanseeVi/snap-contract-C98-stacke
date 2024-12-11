'use client'
import Web3 from 'web3'
import ABI from '../../functionAndAdapter/ABI'
import React, { useEffect, useRef, useState } from 'react'
import bigdecimal from 'bigdecimal'
import * as XLSX from 'xlsx'

export default function Home() {
  const [dataLogs, setDataLogs] = useState()
  const [isLoading, setIsLoading] = useState(false)
  const [addresses, setAddresses] = useState('')
  const inputToBlock = useRef(null)
  const inputFromBlock = useRef(null)
  const [activeChain, setActiveChain] = useState('VIC')
  const [rpcActive, setRpcActive] = useState('https://rpc.viction.xyz')
  const [contractAddress, setContractAddress] = useState(
    '0xb1B7c19c9C919346390a1E40aaBCED8A66b53C06'
  )
  const listRPC = ['VIC', 'BSC', 'ETH']
  const setRPC = () => {
    switch (activeChain) {
      case 'VIC':
        setRpcActive('https://rpc.viction.xyz')
        setContractAddress('0xb1B7c19c9C919346390a1E40aaBCED8A66b53C06')
        break
      case 'BSC':
        setRpcActive('https://bscrpc.com')
        setContractAddress('0x08ac9c38ce078b9b81e5ab5bf8aafc3d2db94385')
        break
      case 'ETH':
        setRpcActive('https://ethereum.publicnode.com')
        setContractAddress('0x836bf46520C373Fdc4dc7E5A3bAe735d13bD44e3')
        break
    }
  }
  const web3 = new Web3(rpcActive)
  const contract = new web3.eth.Contract(ABI, contractAddress)

  const onSelected = (e) => {
    console.log(
      'selected',
      e.target.value,
      { activeChain },
      { contractAddress }
    )
    setActiveChain(e.target.value)
  }
  const connectWallet = async () => {
    try {
      const newAccounts = await window.coin98.provider.request({
        method: 'eth_accounts',
      })
      setAddresses(newAccounts[0])
    } catch (error) {
      console.error('err connect', error)
    }
  }
  console.log(isLoading)

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const convertWeiToBalance = (strValue, iDecimal = 18) => {
    try {
      const decimalFormat = parseFloat(iDecimal)

      const multiplyNum = new bigdecimal.BigDecimal(Math.pow(10, decimalFormat))
      const convertValue = new bigdecimal.BigDecimal(String(strValue))
      return convertValue
        .divide(multiplyNum, decimalFormat, bigdecimal.RoundingMode.DOWN())
        .toString()
    } catch (error) {
      return 0
    }
  }

  const filterArray = (data) => {
    const newData = data.reduce((acc, curr) => {
      acc[curr.tokenID] = curr.addressUser
      return acc
    }, {})
    return newData
  }

  const getActiveNft = async (data) => {
    const addressList = [...new Set(Object.values(data))]
    console.log(addressList)
    const result = []

    if (activeChain === 'VIC') {
      for (const item of addressList) {
        try {
          const dataLog = await contract.methods.walletOfOwner(item).call()
          if (Array.isArray(dataLog)) {
            const filteredData = dataLog.filter(
              (itemLog) => itemLog.flag && !itemLog.pending_flag
            )
            const dataHandle = filteredData.map((itemData) => ({
              id: itemData.id,
              est_staked: itemData.est_staked,
              amount: itemData.amount,
            }))
            console.log(dataHandle)
            if (dataHandle.length > 0) {
              result.push({ address: item, data: dataHandle })
            }
          } else {
            console.error(`Unexpected response for ${item}:`, dataLog)
          }
        } catch (error) {
          console.error(`Error processing address ${item}:`, error)
        }
      }
    } else {
      for (const item of addressList) {
        await delay(1000)
        console.log('test delay getNFT')
        try {
          const dataLog = await contract.methods.walletOfOwner(item).call()
          if (Array.isArray(dataLog)) {
            const filteredData = dataLog.filter(
              (itemLog) => itemLog.flag && !itemLog.pending_flag
            )
            const dataHandle = filteredData.map((itemData) => ({
              id: itemData.id,
              est_staked: itemData.est_staked,
              amount: itemData.amount,
            }))
            console.log(dataHandle)
            if (dataHandle.length > 0) {
              result.push({ address: item, data: dataHandle })
            }
          } else {
            console.error(`Unexpected response for ${item}:`, dataLog)
          }
        } catch (error) {
          console.error(`Error processing address ${item}:`, error)
        }
      }
    }

    console.log('Completed processing all addresses.')
    console.log('Result:', result)
    return result
  }

  const getPastLogs = async (inputRPC) => {
    const toBlock = parseInt(inputToBlock.current.value)
    const fromBlock = parseInt(inputFromBlock.current.value)
    try {
      // //44630020
      // //13457759
      switch (inputRPC) {
        case 'VIC':
          console.log('VIC running')
          const logsVIC = await web3.eth.getPastLogs({
            // //tomo
            fromBlock: 72525940,
            toBlock: 'latest',
            address: contractAddress, // Contract NFT
            topics: [
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            ], // Lọc theo hash của sự kiện
          })
          console.log(logsVIC)
          const resultVIC = logsVIC.flat().map((item) => {
            const topic = item.topics
            const addressUser = web3.utils.toChecksumAddress(
              `0x` + topic[2].slice(26)
            )
            const tokenID = web3.utils.hexToNumberString(topic[3])
            return {
              addressUser,
              tokenID,
            }
          })

          console.log(resultVIC)
          const data = await getActiveNft(filterArray(resultVIC))
          // console.log('data', data)
          setDataLogs(data)
          setIsLoading(false)

          break
        case 'ETH':
          const logsEth = async () => {
            const batchSize = 50000 // Kích thước mỗi batch
            // const fromBlock = 13803141;
            // const toBlock = 21341405;
            const promises = []
            for (let i = fromBlock; i <= toBlock; i += batchSize) {
              const endBlock =
                i + batchSize > toBlock ? 'latest' : i + batchSize
              promises.push(
                web3.eth.getPastLogs({
                  fromBlock: i,
                  toBlock: endBlock,
                  address: contractAddress,
                  topics: [
                    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                  ],
                })
              )
            }

            try {
              const logsArray = await Promise.all(promises)
              return logsArray.flat() // Gộp tất cả logs thành một mảng
            } catch (error) {
              console.error('Error fetching logs:', error)
              return []
            }
          }

          const logsETH = await logsEth()
          console.log(logsETH)
          const resultETH = logsETH.flat().map((item) => {
            const topic = item.topics
            const addressUser = web3.utils.toChecksumAddress(
              `0x` + topic[2].slice(26)
            )
            const tokenID = web3.utils.hexToNumberString(topic[3])
            return {
              addressUser,
              tokenID,
            }
          })

          console.log(resultETH)
          const dataETH = await getActiveNft(filterArray(resultETH))
          // console.log('data', data)
          setDataLogs(dataETH)
          setIsLoading(false)

          break
        case 'BSC':
          const logsBsc = async (from, toblock) => {
            let arrayDataBSC = []
            for (let i = from; i <= toblock; i += 50000) {
              await delay(1000)
              console.log('test delay getPastLogs')
              const toBlock = i + 50000 > toblock ? 'latest' : i + 50000
              try {
                const logs = await web3.eth.getPastLogs({
                  fromBlock: i,
                  toBlock: toBlock,
                  address: contractAddress,
                  topics: [
                    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                  ],
                })
                console.log(logs)
                arrayDataBSC = arrayDataBSC.concat(logs)
              } catch (error) {
                console.error(
                  `Error fetching logs from block ${i} to ${toBlock}:`,
                  error
                )
              }
            }
            return arrayData
          }
          const logsBSC = await logsBsc(fromBlock, toBlock)
          console.log(logsBSC)
          const resultBSC = logsBSC.flat().map((item) => {
            const topic = item.topics
            const addressUser = web3.utils.toChecksumAddress(
              `0x` + topic[2].slice(26)
            )
            const tokenID = web3.utils.hexToNumberString(topic[3])
            return {
              addressUser,
              tokenID,
            }
          })

          console.log(resultBSC)
          const dataBSC = await getActiveNft(filterArray(resultBSC))
          // console.log('data', data)

          setDataLogs(dataBSC)
          setIsLoading(false)

          break
      }
    } catch (error) {
      console.log(error)
    }
  }

  const exportExcelData = (idTable, filename = 'data-excel') => {
    const tableSelect = document.getElementById(idTable)
    if (!tableSelect) {
      console.error('Table not found')
      return
    }

    const workbook = XLSX.utils.table_to_book(tableSelect)

    XLSX.writeFile(workbook, `${filename}.xlsx`)
  }
  const dowLoadClicked = () => {
    exportExcelData('tableData', 'data-chain')
  }
  const scanClick = () => {
    setIsLoading(true)
    getPastLogs(activeChain)
  }
  useEffect(() => {
    setRPC()
  }, [activeChain])
  useEffect(() => {
    connectWallet()
    // onClickConnect()
  }, [])
  return (
    <div className='bg-black'>
      <div className='w-full text-center'>
        <div className='text-center text-3xl'>Scan transaction onchain</div>
        <div className='flex justify-between items-center'>
          <form className='w-2/5 mx-auto p-3 rounded-lg bg-yellow-400 text-black'>
            Sellect chain:
            <select onChange={onSelected} className='text-black w-full h-9'>
              {listRPC.map((rpc) => {
                return <option value={rpc}>{rpc}</option>
              })}
            </select>
            <div className='py-2'>
              set block:
              <div className='py-2'>
                <input
                  className='w-full h-9'
                  type={'text'}
                  ref={inputFromBlock}
                  placeholder='enter start block...'
                />
              </div>
              <div>
                <input
                  className='w-full h-9'
                  type={'text'}
                  ref={inputToBlock}
                  placeholder='enter end block...'
                />
              </div>
            </div>
          </form>
        </div>
        <button
          onClick={scanClick}
          className='w-2/5 bg-black py-2 rounded-3xl text-2xl text-white bg-yellow-400 mt-8 '
        >
          Start Scan
        </button>
      </div>
      {dataLogs ? (
        <div className='py-10 items-center text-center'>
          <button
            className='p-5 bg-yellow-500 rounded-3xl'
            onClick={dowLoadClicked}
          >
            Dowload Excel
          </button>
          <table className='p-8' id='tableData'>
            <thead>
              <tr>
                <td>Address</td>
                <td>NFT ID</td>
                <td>Amount</td>
                <td>Reward</td>
              </tr>
            </thead>
            <tbody>
              {dataLogs.map((item, index) => {
                const addressData = item.address
                const dataNft = item.data
                return (
                  <>
                    {dataNft?.map((nft, nftIndex) => {
                      const nftID = nft.id
                      const nftAmount = convertWeiToBalance(nft.amount)
                      const nftReward = convertWeiToBalance(nft.est_staked)
                      return (
                        <tr key={`${index}-${nftIndex}`}>
                          {/* Hiển thị address chỉ ở dòng đầu tiên */}
                          {nftIndex === 0 ? (
                            <td rowSpan={item.data.length}>"{addressData}"</td>
                          ) : null}
                          <td>"{nftID}"</td>
                          <td className='px-5'>{nftAmount}</td>
                          <td>{nftReward < 0.000000001 ? 0 : nftReward}</td>
                        </tr>
                      )
                    })}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : isLoading ? (
        <div className='py-24'>
          <img
            src='https://media.giphy.com/media/3AMRa6DRUhMli/giphy.gif?cid=ecf05e47u171uihxv1972gtzct5ob2c1iv24bnnqccf05ewz&ep=v1_gifs_search&rid=giphy.gif&ct=g/giphy.webp'
            alt='Animated Giphy'
            width={500}
            height={500}
            className='m-auto'
          />
        </div>
      ) : (
        <div className='relative w-[870px] h-[500px] overflow-hidden m-auto my-10'>
          <div className='absolute inset-0 z-10'></div>
          <iframe
            className='absolute inset-0 w-full h-full z-0 border-none'
            src='https://www.youtube.com/embed/qxZ4bdt3L3E?autoplay=1&loop=1&playlist=qxZ4bdt3L3E&controls=0&modestbranding=1&showinfo=0&mute=1'
            allow='autoplay; encrypted-media'
            allowFullScreen
            title='YouTube Video'
          ></iframe>
        </div>
      )}
    </div>
  )
}
