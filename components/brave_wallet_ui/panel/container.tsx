// Copyright (c) 2021 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// you can obtain one at http://mozilla.org/MPL/2.0/.

import * as React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import {
  ConnectWithSite,
  ConnectedPanel,
  Panel,
  WelcomePanel,
  SignPanel,
  AllowAddNetworkPanel,
  ConfirmTransactionPanel,
  ConnectHardwareWalletPanel
} from '../components/extension'
import {
  Send,
  Buy,
  SelectAsset,
  SelectAccount,
  SelectNetwork,
  Swap
} from '../components/buy-send-swap/'
import { AppList } from '../components/shared'
import { filterAppList } from '../utils/filter-app-list'
import {
  ScrollContainer,
  StyledExtensionWrapper,
  SelectContainer,
  SignContainer,
  ConnectWithSiteWrapper
} from '../stories/style'
import { SendWrapper, PanelWrapper } from './style'
import store from './store'
import * as WalletPanelActions from './actions/wallet_panel_actions'
import * as WalletActions from '../common/actions/wallet_actions'
import {
  AppObjectType,
  AppsListType,
  WalletState,
  PanelState,
  PanelTypes,
  WalletPanelState,
  WalletAccountType,
  BuySendSwapViewTypes,
  AccountAssetOptionType,
  EthereumChain,
  ToOrFromType
} from '../constants/types'
import { AppsList } from '../options/apps-list-options'
import LockPanel from '../components/extension/lock-panel'
import { WyreAccountAssetOptions } from '../options/wyre-asset-options'
import { BuyAssetUrl } from '../utils/buy-asset-url'
import { GetNetworkInfo } from '../utils/network-utils'

import { formatBalance, toWeiHex } from '../utils/format-balances'
import { useAssets, useBalance, useSwap } from '../common/hooks'

type Props = {
  panel: PanelState
  wallet: WalletState
  walletPanelActions: typeof WalletPanelActions
  walletActions: typeof WalletActions
}

function mapStateToProps (state: WalletPanelState): Partial<Props> {
  return {
    panel: state.panel,
    wallet: state.wallet
  }
}

function mapDispatchToProps (dispatch: Dispatch): Partial<Props> {
  return {
    walletPanelActions: bindActionCreators(WalletPanelActions, store.dispatch.bind(store)),
    walletActions: bindActionCreators(WalletActions, store.dispatch.bind(store))
  }
}

function Container (props: Props) {
  const {
    accounts,
    selectedAccount,
    selectedNetwork,
    selectedPendingTransaction,
    isWalletLocked,
    favoriteApps,
    hasIncorrectPassword,
    hasInitialized,
    isWalletCreated,
    networkList,
    transactionSpotPrices
  } = props.wallet

  const {
    connectedSiteOrigin,
    panelTitle,
    selectedPanel,
    networkPayload,
    swapQuote
  } = props.panel

  // TODO(petemill): If initial data or UI takes a noticeable amount of time to arrive
  // consider rendering a "loading" indicator when `hasInitialized === false`, and
  // also using `React.lazy` to put all the main UI in a separate JS bundle and display
  // that loading indicator ASAP.
  const [selectedAccounts, setSelectedAccounts] = React.useState<WalletAccountType[]>([])
  const [filteredAppsList, setFilteredAppsList] = React.useState<AppsListType[]>(AppsList)
  const [walletConnected, setWalletConnected] = React.useState<boolean>(true)
  const [selectedWyreAsset, setSelectedWyreAsset] = React.useState<AccountAssetOptionType>(WyreAccountAssetOptions[0])
  const [showSelectAsset, setShowSelectAsset] = React.useState<boolean>(false)
  const [toAddress, setToAddress] = React.useState('')
  const [sendAmount, setSendAmount] = React.useState('')
  const [buyAmount, setBuyAmount] = React.useState('')

  const {
    assetOptions,
    userVisibleTokenOptions,
    sendAssetOptions
  } = useAssets(selectedAccount, props.wallet.fullTokenList, props.wallet.userVisibleTokensInfo)

  const {
    exchangeRate,
    filteredAssetList,
    fromAmount,
    fromAsset,
    isSwapButtonDisabled,
    orderExpiration,
    orderType,
    slippageTolerance,
    swapToOrFrom,
    toAmount,
    toAsset,
    setFromAsset,
    setSwapToOrFrom,
    onToggleOrderType,
    onSwapQuoteRefresh,
    flipSwapAssets,
    onSubmitSwap,
    onSelectExpiration,
    onSelectSlippageTolerance,
    onSwapInputChange,
    onFilterAssetList,
    onSelectTransactAsset
  } = useSwap(
    selectedAccount,
    selectedNetwork,
    props.walletPanelActions.fetchPanelSwapQuote,
    assetOptions,
    swapQuote
  )

  const getSelectedAccountBalance = useBalance(selectedAccount)
  const { assetBalance: fromAssetBalance } = getSelectedAccountBalance(fromAsset)
  const { assetBalance: toAssetBalance } = getSelectedAccountBalance(toAsset)

  const onSetBuyAmount = (value: string) => {
    setBuyAmount(value)
  }

  const onSubmitBuy = () => {
    const url = BuyAssetUrl(selectedNetwork.chainId, selectedWyreAsset, selectedAccount, buyAmount)
    if (url) {
      chrome.tabs.create({ url: url }, () => {
        if (chrome.runtime.lastError) {
          console.error('tabs.create failed: ' + chrome.runtime.lastError.message)
        }
      })
    }
  }

  const onChangeSendView = (view: BuySendSwapViewTypes) => {
    if (view === 'assets') {
      setShowSelectAsset(true)
    }
  }

  const onChangeSwapView = (view: BuySendSwapViewTypes, option?: ToOrFromType) => {
    if (view === 'assets') {
      setShowSelectAsset(true)
    }

    if (option) {
      setSwapToOrFrom(option)
    }
  }

  const onHideSelectAsset = () => {
    setShowSelectAsset(false)
  }

  const onSelectAsset = (asset: AccountAssetOptionType) => () => {
    if (selectedPanel === 'buy') {
      setSelectedWyreAsset(asset)
    } else if (selectedPanel === 'swap') {
      onSelectTransactAsset(asset, swapToOrFrom)
    } else {
      setFromAsset(asset)
    }

    setShowSelectAsset(false)
  }

  const onInputChange = (value: string, name: string) => {
    if (name === 'address') {
      setToAddress(value)
    } else {
      setSendAmount(value)
    }
  }

  const onSelectPresetSendAmount = (percent: number) => {
    const amount = Number(fromAsset.assetBalance) * percent
    const formatedAmmount = formatBalance(amount.toString(), fromAsset.asset.decimals)
    setSendAmount(formatedAmmount)
  }

  const onSubmitSend = () => {
    fromAsset.asset.isErc20 && props.walletActions.sendERC20Transfer({
      from: selectedAccount.address,
      to: toAddress,
      value: toWeiHex(sendAmount, fromAsset.asset.decimals),
      contractAddress: fromAsset.asset.contractAddress
    })

    !fromAsset.asset.isErc20 && props.walletActions.sendTransaction({
      from: selectedAccount.address,
      to: toAddress,
      value: toWeiHex(sendAmount, fromAsset.asset.decimals)
    })
  }

  const toggleConnected = () => {
    setWalletConnected(!walletConnected)
  }

  const [readyToConnect, setReadyToConnect] = React.useState<boolean>(false)
  const selectAccount = (account: WalletAccountType) => {
    const newList = [...selectedAccounts, account]
    setSelectedAccounts(newList)
  }
  const removeAccount = (account: WalletAccountType) => {
    const newList = selectedAccounts.filter(
      (accounts) => accounts.id !== account.id
    )
    setSelectedAccounts(newList)
  }
  const [inputValue, setInputValue] = React.useState<string>('')
  const onSubmit = () => {
    props.walletPanelActions.connectToSite({
      selectedAccounts,
      siteToConnectTo: connectedSiteOrigin
    })
  }
  const primaryAction = () => {
    if (!readyToConnect) {
      setReadyToConnect(true)
    } else {
      onSubmit()
      setSelectedAccounts([])
      setReadyToConnect(false)
    }
  }
  const secondaryAction = () => {
    if (readyToConnect) {
      setReadyToConnect(false)
    } else {
      props.walletPanelActions.cancelConnectToSite({
        selectedAccounts,
        siteToConnectTo: props.panel.connectedSiteOrigin
      })
      setSelectedAccounts([])
      setReadyToConnect(false)
    }
  }
  const unlockWallet = () => {
    props.walletActions.unlockWallet({ password: inputValue })
    setInputValue('')
  }
  const onLockWallet = () => {
    props.walletActions.lockWallet()
  }
  const handlePasswordChanged = (value: string) => {
    setInputValue(value)
    if (hasIncorrectPassword) {
      props.walletActions.hasIncorrectPassword(false)
    }
  }
  const onRestore = () => {
    props.walletPanelActions.expandRestoreWallet()
  }
  const onSetup = () => {
    props.walletPanelActions.setupWallet()
  }
  const addToFavorites = (app: AppObjectType) => {
    props.walletActions.addFavoriteApp(app)
  }

  const navigateTo = (path: PanelTypes) => {
    if (path === 'expanded') {
      props.walletPanelActions.expandWallet()
    } else {
      props.walletPanelActions.navigateTo(path)
    }
  }

  const browseMore = () => {
    props.walletPanelActions.openWalletApps()
  }

  const removeFromFavorites = (app: AppObjectType) => {
    props.walletActions.removeFavoriteApp(app)
  }

  const filterList = (event: any) => {
    filterAppList(event, AppsList(), setFilteredAppsList)
  }

  const onSelectAccount = (account: WalletAccountType) => () => {
    props.walletActions.selectAccount(account)
    props.walletPanelActions.navigateTo('main')
  }

  const onSelectNetwork = (network: EthereumChain) => () => {
    props.walletActions.selectNetwork(network)
    props.walletPanelActions.navigateTo('main')
  }

  const onReturnToMain = () => {
    props.walletPanelActions.navigateTo('main')
  }

  const onCancelSigning = () => {
    // Logic here to cancel signing
  }

  const onSignData = () => {
    // Logic here to sign a transaction
  }

  const onApproveAddNetwork = () => {
    props.walletPanelActions.addEthereumChainRequestCompleted({ chainId: networkPayload.chainId, approved: true })
  }

  const onCancelAddNetwork = () => {
    props.walletPanelActions.addEthereumChainRequestCompleted({ chainId: networkPayload.chainId, approved: false })
  }

  const onNetworkLearnMore = () => {
    chrome.tabs.create({
      url: 'https://support.brave.com/'
    }).catch((e) => { console.error(e) })
  }

  const onRejectTransaction = () => {
    if (selectedPendingTransaction) {
      props.walletActions.rejectTransaction(selectedPendingTransaction)
    }
  }

  const onConfirmTransaction = () => {
    if (selectedPendingTransaction) {
      props.walletActions.approveTransaction(selectedPendingTransaction)
    }
  }

  const onOpenSettings = () => {
    props.walletPanelActions.openWalletSettings()
  }

  const onCancelConnectHardwareWallet = () => {
    // Logic here to cancel connecting your hardware wallet
  }

  if (!hasInitialized || !accounts) {
    return null
  }

  if (!isWalletCreated) {
    return (
      <PanelWrapper isLonger={true}>
        <StyledExtensionWrapper>
          <WelcomePanel onRestore={onRestore} onSetup={onSetup} />
        </StyledExtensionWrapper>
      </PanelWrapper>
    )
  }

  if (isWalletLocked) {
    return (
      <PanelWrapper isLonger={false}>
        <StyledExtensionWrapper>
          <LockPanel
            hasPasswordError={hasIncorrectPassword}
            onSubmit={unlockWallet}
            disabled={inputValue === ''}
            onPasswordChanged={handlePasswordChanged}
            onClickRestore={onRestore}
          />
        </StyledExtensionWrapper>
      </PanelWrapper>
    )
  }

  if (selectedPendingTransaction) {
    return (
      <PanelWrapper isLonger={true}>
        <SignContainer>
          <ConfirmTransactionPanel
            onConfirm={onConfirmTransaction}
            onReject={onRejectTransaction}
            accounts={accounts}
            selectedNetwork={GetNetworkInfo(selectedNetwork.chainId, networkList)}
            transactionInfo={selectedPendingTransaction}
            transactionSpotPrices={transactionSpotPrices}
            visibleTokens={userVisibleTokenOptions}
          />
        </SignContainer>
      </PanelWrapper>
    )
  }

  if (selectedPanel === 'connectHardwareWallet') {
    return (
      <PanelWrapper isLonger={false}>
        <StyledExtensionWrapper>
          <ConnectHardwareWalletPanel
            onCancel={onCancelConnectHardwareWallet}
            isConnected={false}
            walletName='Ledger 1'
            // Pass a boolean true here to show needs Transaction Confirmation state
            requestingConfirmation={false}
          />
        </StyledExtensionWrapper>
      </PanelWrapper>
    )
  }

  if (selectedPanel === 'addEthereumChain') {
    return (
      <PanelWrapper isLonger={true}>
        <SignContainer>
          <AllowAddNetworkPanel
            onApprove={onApproveAddNetwork}
            onCancel={onCancelAddNetwork}
            onLearnMore={onNetworkLearnMore}
            networkPayload={networkPayload}
          />
        </SignContainer>
      </PanelWrapper>
    )
  }

  if (selectedPanel === 'signData') {
    return (
      <PanelWrapper isLonger={true}>
        <SignContainer>
          <SignPanel
            message='Pass Sign Transaction Message Here'
            onCancel={onCancelSigning}
            onSign={onSignData}
            selectedAccount={selectedAccount}
            selectedNetwork={GetNetworkInfo(selectedNetwork.chainId, networkList)}
            // Pass a boolean here if the signing method is risky
            showWarning={true}
          />
        </SignContainer>
      </PanelWrapper>
    )
  }

  if (showSelectAsset) {
    let assets: AccountAssetOptionType[]
    if (selectedPanel === 'buy') {
      assets = WyreAccountAssetOptions
    } else if (selectedPanel === 'send') {
      assets = sendAssetOptions
    } else {  // swap
      assets = filteredAssetList
    }
    return (
      <PanelWrapper isLonger={false}>
        <SelectContainer>
          <SelectAsset
            assets={assets}
            onSelectAsset={onSelectAsset}
            onBack={onHideSelectAsset}
          />
        </SelectContainer>
      </PanelWrapper>
    )
  }

  if (selectedPanel === 'networks') {
    return (
      <PanelWrapper isLonger={false}>
        <SelectContainer>
          <SelectNetwork
            networks={networkList}
            onBack={onReturnToMain}
            onSelectNetwork={onSelectNetwork}
          />
        </SelectContainer>
      </PanelWrapper>
    )
  }

  if (selectedPanel === 'accounts') {
    return (
      <PanelWrapper isLonger={false}>
        <SelectContainer>
          <SelectAccount
            accounts={accounts}
            onBack={onReturnToMain}
            onSelectAccount={onSelectAccount}
          />
        </SelectContainer>
      </PanelWrapper>
    )
  }

  if (selectedPanel === 'apps') {
    return (
      <PanelWrapper isLonger={false}>
        <StyledExtensionWrapper>
          <Panel
            navAction={navigateTo}
            title={panelTitle}
            useSearch={selectedPanel === 'apps'}
            searchAction={selectedPanel === 'apps' ? filterList : undefined}
          >
            <ScrollContainer>
              <AppList
                list={filteredAppsList}
                favApps={favoriteApps}
                addToFav={addToFavorites}
                removeFromFav={removeFromFavorites}
                action={browseMore}
              />
            </ScrollContainer>
          </Panel>
        </StyledExtensionWrapper>
      </PanelWrapper>
    )
  }

  if (selectedPanel === 'connectWithSite') {
    const accountsToConnect = props.wallet.accounts.filter(
      (account) => props.panel.connectingAccounts.includes(account.address.toLowerCase())
    )
    return (
      <PanelWrapper isLonger={true}>
        <ConnectWithSiteWrapper>
          <ConnectWithSite
            siteURL={connectedSiteOrigin}
            isReady={readyToConnect}
            accounts={accountsToConnect}
            primaryAction={primaryAction}
            secondaryAction={secondaryAction}
            selectAccount={selectAccount}
            removeAccount={removeAccount}
            selectedAccounts={selectedAccounts}
          />
        </ConnectWithSiteWrapper>
      </PanelWrapper>
    )
  }

  if (selectedPanel === 'send') {
    return (
      <PanelWrapper isLonger={false}>
        <StyledExtensionWrapper>
          <Panel
            navAction={navigateTo}
            title={panelTitle}
            useSearch={false}
          >
            <SendWrapper>
              <Send
                onChangeSendView={onChangeSendView}
                onInputChange={onInputChange}
                onSelectPresetAmount={onSelectPresetSendAmount}
                onSubmit={onSubmitSend}
                selectedAsset={fromAsset}
                selectedAssetAmount={sendAmount}
                selectedAssetBalance={fromAssetBalance}
                toAddress={toAddress}
              />
            </SendWrapper>
          </Panel>
        </StyledExtensionWrapper>
      </PanelWrapper>
    )
  }

  if (selectedPanel === 'buy') {
    return (
      <PanelWrapper isLonger={false}>
        <StyledExtensionWrapper>
          <Panel
            navAction={navigateTo}
            title={panelTitle}
            useSearch={false}
          >
            <SendWrapper>
              <Buy
                onChangeBuyView={onChangeSendView}
                onInputChange={onSetBuyAmount}
                onSubmit={onSubmitBuy}
                selectedAsset={selectedWyreAsset}
                buyAmount={buyAmount}
                selectedNetwork={GetNetworkInfo(selectedNetwork.chainId, networkList)}
                networkList={networkList}
              />
            </SendWrapper>
          </Panel>
        </StyledExtensionWrapper>
      </PanelWrapper>
    )
  }

  if (selectedPanel === 'swap') {
    return (
        <PanelWrapper isLonger={false}>
          <StyledExtensionWrapper>
            <Panel
                navAction={navigateTo}
                title={panelTitle}
                useSearch={false}
            >
              <SendWrapper>
                <Swap
                  fromAsset={fromAsset}
                  toAsset={toAsset}
                  fromAmount={fromAmount}
                  toAmount={toAmount}
                  exchangeRate={exchangeRate}
                  orderType={orderType}
                  orderExpiration={orderExpiration}
                  slippageTolerance={slippageTolerance}
                  isSubmitDisabled={isSwapButtonDisabled}
                  fromAssetBalance={fromAssetBalance}
                  toAssetBalance={toAssetBalance}
                  onToggleOrderType={onToggleOrderType}
                  onSelectExpiration={onSelectExpiration}
                  onSelectSlippageTolerance={onSelectSlippageTolerance}
                  onFlipAssets={flipSwapAssets}
                  onSubmitSwap={onSubmitSwap}
                  onQuoteRefresh={onSwapQuoteRefresh}
                  onSelectPresetAmount={onSelectPresetSendAmount}
                  onInputChange={onSwapInputChange}
                  onFilterAssetList={onFilterAssetList}
                  onChangeSwapView={onChangeSwapView}
                />
              </SendWrapper>
            </Panel>
          </StyledExtensionWrapper>
        </PanelWrapper>
    )
  }

  return (
    <PanelWrapper isLonger={false}>
      <ConnectedPanel
        selectedAccount={selectedAccount}
        selectedNetwork={GetNetworkInfo(selectedNetwork.chainId, networkList)}
        isConnected={walletConnected}
        connectAction={toggleConnected}
        navAction={navigateTo}
        onLockWallet={onLockWallet}
        onOpenSettings={onOpenSettings}
      />
    </PanelWrapper>
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(Container)
