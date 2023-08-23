import { LightningElement, api, wire } from "lwc";
import getAccountsContacts from "@salesforce/apex/ContactService.getAccountsContacts";
import {
  EnclosingTabId,
  openTab,
  openSubtab,
  getTabInfo
} from "lightning/platformWorkspaceApi";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE,
  MessageContext
} from "lightning/messageService";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import lightning__tabClosed from "@salesforce/messageChannel/lightning__tabClosed";
import lightning__tabCreated from "@salesforce/messageChannel/lightning__tabCreated";

export default class WorkspaceApiContact extends LightningElement {
  @api recordId;
  @wire(getAccountsContacts, { accountId: "$recordId" }) contacts;
  @wire(EnclosingTabId) tabId;
  @wire(MessageContext) messageContext;
  openedTabs = {};

  connectedCallback() {
    this.subscribeToMessageChannel();
  }

  disconnectedCallback() {
    this.unsubscribeToMessageChannel();
  }

  handleSubtabOpen(event) {
    const contactId = event.target.dataset.id;
    openSubtab(this.tabId, {
      recordId: contactId,
      focus: false
    });
  }

  handleTabOpen(event) {
    const contactId = event.target.dataset.id;

    openTab({
      recordId: contactId
    });
  }

  subscribeToMessageChannel() {
    if (!this.tabClosedSubscription) {
      this.tabClosedSubscription = subscribe(
        this.messageContext,
        lightning__tabClosed,
        (message) => this.handleTabClosedMessage(message),
        { scope: APPLICATION_SCOPE }
      );
    }

    if (!this.tabCreatedSubscription) {
      this.tabCreatedSubscription = subscribe(
        this.messageContext,
        lightning__tabCreated,
        (message) => this.handleTabCreatedMessage(message),
        { scope: APPLICATION_SCOPE }
      );
    }
  }

  async handleTabClosedMessage(message) {
    const { tabId } = message;
    const contactName = this.openedTabs[tabId];

    if (contactName) {
      delete this.openedTabs[tabId];

      const tabOpened = tabId.includes("_") ? "Subtab" : "Tab";

      const evt = new ShowToastEvent({
        title: `${tabOpened} closed`,
        message: `${tabOpened} with ${contactName}'s details closed.`,
        variant: "success"
      });
      this.dispatchEvent(evt);
    }
  }

  async handleTabCreatedMessage(message) {
    const { tabId } = message;
    const tabInfo = await getTabInfo(tabId);

    const { objectApiName, recordId } = tabInfo.pageReference.attributes;
    const tabOpened = tabInfo.isSubtab ? "subtab" : "tab";

    if (objectApiName === "Contact") {
      const contactName = this.contacts.data.find(
        (contact) => contact.Id === recordId
      ).Name;

      this.openedTabs = { ...this.openedTabs, [tabId]: contactName };

      const evt = new ShowToastEvent({
        title: `New ${tabOpened} opened`,
        message: `New ${tabOpened} with ${contactName}'s details opened.`,
        variant: "success"
      });
      this.dispatchEvent(evt);
    }
  }

  unsubscribeToMessageChannel() {
    unsubscribe(this.tabClosedSubscription);
    unsubscribe(this.tabCreatedSubscription);
    this.tabClosedSubscription = null;
    this.tabCreatedSubscription = null;
  }
}
