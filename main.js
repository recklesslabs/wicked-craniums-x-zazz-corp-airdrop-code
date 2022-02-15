require("dotenv").config();
const { toChecksumAddress } = require("ethereum-checksum-address");

const fs = require("fs");
const _ = require("lodash-contrib");

const constants = {
  Cranium: "0x85f740958906b317de6ed79663012859067e745b",
  Stallion: "0x45d8f7db9b437efbc74ba6a945a81aaf62dceda7",
  Comic: "0xa932dac13bed512aaa12975f7ad892afb120022f",
  Staking: "0xa265bd2ba7e49bcc77cef4a7b05c7799ec8b8387",
  Haylos: "0xb8bd00aa3a8fa212e0654c7382c1c7936c9728e6",
  Zero: "0x0000000000000000000000000000000000000000",
};

// -- request blockchain data --
//
const COVALENTHQ_API_KEY = ""; // process.env.COVALENTHQ_API_KEY;
const axios = require("axios");
const pagesize = 1000000;
const API = `https://api.covalenthq.com`;

// Block at Feb-13-2022 08:00:01 PM +UTC (12:00 pm Pacific Time)
// https://etherscan.io/block/14199836
const block = 14199836;

const cranium_holders_data_filename = "cranium_holders_data.json";
const staking_data_filename = "staking_data.json";
const dataDir = "./data/";

// Download Cranium Holders data.
// https://www.covalenthq.com/docs/api/#/0/Class-A/Get-token-holders-as-of-any-block-height/lng=en
function download_cranium_holders_data() {
  axios
    .get(
      `${API}/v1/1/tokens/${constants.Cranium}/token_holders/?block-height=${block}&page-size=${pagesize}&key=${COVALENTHQ_API_KEY}`
    )
    .then((response) => {
      fs.writeFileSync(
        dataDir + cranium_holders_data_filename,
        JSON.stringify(response.data)
      );
    })
    .catch((error) => {
      console.log(error);
    });
}

// Download Staking data.
// https://www.covalenthq.com/docs/api/#/0/Class-A/Get-transactions-for-address/lng=en
function download_staking_data() {
  axios
    .get(
      `${API}/v1/1/address/${constants.Staking}/transactions_v2/?block-height=${block}&page-size=${pagesize}&key=${COVALENTHQ_API_KEY}`
    )
    .then((response) => {
      fs.writeFileSync(
        dataDir + staking_data_filename,
        JSON.stringify(response.data)
      );
    })
    .catch((error) => {
      console.log(error);
    });
}

// -- Save blockchain data --
//
// download_cranium_holders_data();
// download_staking_data();
//

// -- Process blockchain data --

function parseStakingTransactionsFile() {
  return JSON.parse(
    fs.readFileSync(dataDir + staking_data_filename, { encoding: "utf-8" })
  );
}

// [address, total_craniums_held]
function cranium_balances(cranium_holders_json) {
  return cranium_holders_json.data.items.map((e) => [
    e.address,
    parseInt(e.balance),
  ]);
}

// [item, frequency][] -> item[]
// flatten a frequency assoc by duplicating items
function flatten_frequency_assoc(assoc) {
  return assoc.reduce((acc, curr) => {
    let [item, freq] = curr;
    return [...acc, ...[...Array(freq)].map((e) => item)];
  }, []);
}

// get array of all addresses that hold craniums. repeated as many times as
// the # of craniums they hold.
function holders_arr(cranium_holders_json) {
  let cranium_balances_freq = cranium_balances(cranium_holders_json);
  // fst is the balance for the staking contract.
  let [fst, ...rst] = cranium_balances_freq;
  let flattened_addresses = flatten_frequency_assoc(rst);
  return flattened_addresses;
}

function parseCraniumHoldersFile() {
  return JSON.parse(
    fs.readFileSync(dataDir + cranium_holders_data_filename, {
      encoding: "utf-8",
    })
  );
}

function getCraniumHolderAddresses() {
  return holders_arr(parseCraniumHoldersFile());
}

// -- process staking data --

function staking_contract_transfers(staking_transactions_json) {
  let items = staking_transactions_json.data.items;
  let transfers = [];
  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    let log_events = item.log_events;
    for (let j = 0; j < log_events.length; j++) {
      let logevent = log_events[j];
      if (logevent.decoded.name === "Transfer") {
        transfers.push([
          logevent.sender_address, // sender
          logevent.decoded.params[0].value, // from
          logevent.decoded.params[1].value, // to
        ]);
      }
    }
  }
  return transfers;
}

// filter log events by either staking or unstaking transfers
// transfers is [sender, from to][]
function filter_log_events(transfers) {
  return transfers.filter((transfer) => {
    let [sender, from, to] = transfer;
    return (
      sender !== constants.Haylos &&
      sender !== constants.Comic &&
      sender !== constants.Stallion &&
      // someone sent SOS token to the Staking contract.
      sender !== "0x3b484b82567a09e2588a13d54d032153f0c0aee0"
    );
  });
}

function filter_by_staking_and_unstaking(staking_unstaking_assoc) {
  let staking = [];
  let unstaking = [];
  for (let i = 0; i < staking_unstaking_assoc.length; i++) {
    let elem = staking_unstaking_assoc[i];
    if (elem[0] === constants.Staking) {
      unstaking.push(elem);
    } else {
      staking.push(elem);
    }
  }
  return [staking, unstaking];
}

function remove_first_occurrence(elem, arr) {
  let res = [];
  let removed_first = false;
  for (let i = 0; i < arr.length; i++) {
    let arr_elem = arr[i];
    if (removed_first) {
      res.push(arr_elem);
    } else {
      if (arr_elem === elem) {
        removed_first = true;
      } else {
        res.push(arr_elem);
      }
    }
  }
  return res;
}

function get_still_staked_addresses() {
  let all_transfers = staking_contract_transfers(
    parseStakingTransactionsFile()
  );
  let stake_unstake_transfers = filter_log_events(all_transfers);
  let staking_unstaking_assoc = stake_unstake_transfers.map((e) => [
    e[1],
    e[2],
  ]);
  let [staking, unstaking] = filter_by_staking_and_unstaking(
    staking_unstaking_assoc
  );
  let staking_addresses = staking.map((e) => e[0]);
  let unstaking_addresses = unstaking.map((e) => e[1]);
  return unstaking_addresses.reduce((acc, curr) => {
    return remove_first_occurrence(curr, acc);
  }, staking_addresses);
}

function all_holders() {
  return [...get_still_staked_addresses(), ...getCraniumHolderAddresses()];
}

function printFrequencies() {
  Object.entries(_.frequencies(all_holders())).forEach((e) => {
    console.log(`${e[1]} ${e[0]}`);
  });
}
// - - - CHECKSUM ADDRESSES - - -

function checksumAddresses(holders_file_path) {
  fs.readFileSync(holders_file_path, { encoding: "utf-8" })
    .split("\n")
    .map((e) => e.split(" "))
    .map((e) => [e[0], toChecksumAddress(e[1])])
    .forEach((e) => {
      console.log(`${e[0]} ${e[1]}`);
    });
}

// - - - METADATA GENERATION - - -

function generateMetadata() {
  for (let i = 0; i <= 4669; i++) {
    if (i >= 0 && i <= 3120) {
      let link = `https://ipfs.io/ipfs/bafybeiaqjfmuijlcc7zo3agiz5hjh4c5rcrqnw2ubdrwsqzb3oh7vhef6e`;
      fs.writeFileSync(
        "./metadata/" + i.toString(),
        JSON.stringify({
          name: `Wicked Craniums X Zazzc0rp #${i}`,
          external_link: "https://wickedcranium.com/",
          image: link,
          attributes: [
            {
              trait_type: "Tier",
              value: "5",
            },
          ],
        })
      );
    } else if (i >= 3121 && i <= 4325) {
      let link = `https://ipfs.io/ipfs/bafybeiclhtpjyuijkqkwfgcbprwyn4z4xjej7n6e4ieoyjifbdyh2kng3y`;
      fs.writeFileSync(
        "./metadata/" + i.toString(),
        JSON.stringify({
          name: `Wicked Craniums X Zazzc0rp #${i}`,
          external_link: "https://wickedcranium.com/",
          image: link,
          attributes: [
            {
              trait_type: "Tier",
              value: "4",
            },
          ],
        })
      );
    } else if (i >= 4326 && i <= 4620) {
      let link = `https://ipfs.io/ipfs/bafybeidb2ec2qzfibeccx7uto2edc74rrlcxhsoxxdlnmwzvhvjsmd4dvy`;
      fs.writeFileSync(
        "./metadata/" + i.toString(),
        JSON.stringify({
          name: `Wicked Craniums X Zazzc0rp #${i}`,
          external_link: "https://wickedcranium.com/",
          image: link,
          attributes: [
            {
              trait_type: "Tier",
              value: "3",
            },
          ],
        })
      );
    } else if (i >= 4621 && i <= 4663) {
      let link = `https://ipfs.io/ipfs/bafybeifsd6netdblcfpuvqyd7d753ijqi6rranvcwgpg3incj3l4xvseoy`;
      fs.writeFileSync(
        "./metadata/" + i.toString(),
        JSON.stringify({
          name: `Wicked Craniums X Zazzc0rp #${i}`,
          external_link: "https://wickedcranium.com/",
          image: link,
          attributes: [
            {
              trait_type: "Tier",
              value: "2",
            },
          ],
        })
      );
    } else {
      let link = `https://ipfs.io/ipfs/bafybeiblrytjs6hb5n2qm6sngz3kzwdaptdumxmrdf6nh6mcdbusdycr6u`;
      fs.writeFileSync(
        "./metadata/" + i.toString(),
        JSON.stringify({
          name: `Wicked Craniums X Zazzc0rp #${i}`,
          external_link: "https://wickedcranium.com/",
          image: link,
          attributes: [
            {
              trait_type: "Tier",
              value: "1",
            },
          ],
        })
      );
    }
  }
}
