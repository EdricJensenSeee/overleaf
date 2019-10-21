const RecurlyWrapper = require('../../app/src/Features/Subscription/RecurlyWrapper')
const async = require('async')
const CSVParser = require('json2csv').Parser

const NOW = new Date()

const getAccountSubscription = (account, callback) =>
  RecurlyWrapper.getSubscriptions(account.account_code, (error, response) => {
    if (error) {
      console.warn(
        `Errors getting subscription for account ${account.account_code}`,
        error
      )
      return callback()
    }
    callback(null, response.subscriptions[0])
  })

const isAccountUsingPaypal = (account, callback) =>
  RecurlyWrapper.getBillingInfo(account.account_code, (error, response) => {
    if (error) {
      console.warn(
        `Errors getting billing info for account ${account.account_code}`,
        error
      )
      return callback(null, false)
    }
    if (response.billing_info.paypal_billing_agreement_id) {
      return callback(null, true)
    }
    callback(null, false)
  })

const printAccountCSV = (account, callback) => {
  isAccountUsingPaypal(account, (error, isPaypal) => {
    if (error || !isPaypal) {
      return callback(error)
    }
    getAccountSubscription(account, (error, subscription) => {
      if (error || !subscription) {
        return callback(error)
      }
      const endAt = new Date(subscription.current_period_ends_at)
      if (subscription.expires_at) {
        return callback()
      }
      const csvData = {
        email: account.email,
        first_name: account.first_name,
        last_name: account.last_name,
        hosted_login_token: account.hosted_login_token,
        billing_info_url: `https://sharelatex.recurly.com/account/billing_info/edit?ht=${
          account.hosted_login_token
        }`,
        account_management_url: `https://sharelatex.recurly.com/account/${
          account.hosted_login_token
        }`,
        current_period_ends_at: `${endAt.getFullYear()}-${endAt.getMonth() +
          1}-${endAt.getDate()}`,
        current_period_ends_at_segment: parseInt(
          ((endAt - NOW) / 1000 / 3600 / 24 / 365) * 7
        )
      }
      callback(null, csvData)
    })
  })
}

const printAccountsCSV = callback => {
  RecurlyWrapper.getAccounts({ state: 'subscriber' }, (error, accounts) => {
    if (error) {
      return callback(error)
    }
    async.mapLimit(accounts, 10, printAccountCSV, (error, csvData) => {
      csvData = csvData.filter(d => !!d)
      callback(error, csvData)
    })
  })
}

const csvFields = [
  'email',
  'first_name',
  'last_name',
  'hosted_login_token',
  'billing_info_url',
  'account_management_url',
  'current_period_ends_at',
  'current_period_ends_at_segment'
]
const csvParser = new CSVParser({ csvFields })

// print each account
printAccountsCSV((error, csvData) => {
  if (error) {
    throw error
  }
  console.log(csvParser.parse(csvData))
  process.exit()
})
