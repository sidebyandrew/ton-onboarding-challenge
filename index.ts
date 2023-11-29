
// write your NFT miner here
import {Address} from "ton"
import { TonClient} from "ton"
import {getHttpEndpoint} from "@orbs-network/ton-access";
import {BN} from 'bn.js'
import {unixNow} from "./src/lib/utils";
import {MineMessageParams, Queries} from "./src/giver/NftGiver.data";
import {toNano} from "ton"


async function main () {

    const wallet = Address.parse('UQAX3Jf_L4J_SKmMskFfhgqJkOoD9ls70Tx7OaQYxmuBgKSR');
    const collection = Address.parse('EQDk8N7xM5D669LC2YACrseBJtDyFqwtSPCNhRWXU7kjEptX');


    // ... previous code

    // get the decentralized RPC endpoint in Testnet
    const endpoint = await getHttpEndpoint({
        network: "mainnet",
        // network: "testnet",
    });

    // initialize ton library
    const client = new TonClient({ endpoint });

    const miningData = await client.callGetMethod(collection, 'get_mining_data')

    // console.log(miningData)


    const parseStackNum = (sn: any) => new BN(sn[1].substring(2), 'hex');

    const complexity = parseStackNum(miningData.stack[0]);
    const last_success = parseStackNum(miningData.stack[1]);
    const seed = parseStackNum(miningData.stack[2]);
    const target_delta = parseStackNum(miningData.stack[3]);
    const min_cpl = parseStackNum(miningData.stack[4]);
    const max_cpl = parseStackNum(miningData.stack[5]);

    //对于矿工来说是最重要的数字。这是值的工作量证明复杂性。如果最终的哈希值小于复杂性，那么您就成功了。
    console.log('complexity', complexity);

    //是 unix 时间戳日期和时间表示形式，用于跟踪 TON 上的最后一次挖掘交易。
    // 每次last_success指标发生变化时，都需要再次运行挖矿，因为在此过程中种子也会发生变化。
    console.log('last_success', last_success.toString());

    //表示智能合约生成的唯一值，用于计算所需的哈希值。为了更好地理解此过程并了解有关种子如何变化及其原因的更多信息，请
    // 使用 ctx_seed 关键字（Ctrl+F 和关键字“ctx_seed”）查看项目文件文件夹。
    console.log('seed', seed);
    console.log('target_delta', target_delta.toString());
    console.log('min_cpl', min_cpl.toString());
    console.log('max_cpl', max_cpl.toString());



    const mineParams : MineMessageParams = {
        expire: unixNow() + 300, // 5 min(300秒) is enough to make a transaction
        mintTo: wallet, // your wallet
        data1: new BN(0), // temp variable to increment in the miner
        seed // unique seed from get_mining_data
    };

    let msg = Queries.mine(mineParams);
    let progress = 0;

    while (new BN(msg.hash(), 'be').gt(complexity)) {
        progress += 1
        console.clear()
        console.log(`Mining started: please, wait for 30-60 seconds to mine your NFT!`)
        console.log(' ')
        console.log(`⛏ Mined ${progress} hashes! Last: `, new BN(msg.hash(), 'be').toString())

        mineParams.expire = unixNow() + 300
        mineParams.data1.iaddn(1)
        msg = Queries.mine(mineParams)
    }

    console.log(' ')
    console.log('💎 Mission completed: msg_hash less than pow_complexity found!');
    console.log(' ')
    console.log('msg_hash: ', new BN(msg.hash(), 'be').toString())
    console.log('pow_complexity: ', complexity.toString())
    console.log('msg_hash < pow_complexity: ', new BN(msg.hash(), 'be').lt(complexity))


    console.log(' ');
    console.log("💣 WARNING! As soon as you find the hash, you should quickly send the transaction.");
    console.log("If someone else sends a transaction before you, the seed changes, and you'll have to find the hash again!");
    console.log(' ');

    // flags work only in user-friendly address form
    const collectionAddr = collection.toFriendly({
        urlSafe: true,
        bounceable: true,
    })
    // we must convert TON to nanoTON
    const amountToSend = toNano('0.05').toString()
    // BOC means Bag Of Cells here
    const preparedBodyCell = msg.toBoc().toString('base64url')

    // final method to build a payment URL
    const tonDeepLink = (address: string, amount: string, body: string) => {
        return `ton://transfer/${address}?amount=${amount}&bin=${body}`;
    };

    const link = tonDeepLink(collectionAddr, amountToSend, preparedBodyCell);

    console.log('🚀 Link to receive an NFT:')
    console.log(link);

    const qrcode = require('qrcode-terminal');

    qrcode.generate(link, {small: true}, function (qrcode : any) {
        console.log('🚀 Link to mine your NFT (use Tonkeeper in testnet mode):')
        console.log(qrcode);
        console.log('* If QR is still too big, please run script from the terminal. (or make the font smaller)')
    });
}

main()