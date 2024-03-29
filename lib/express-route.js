import {
  getBlobContainerClient,
  getBlobContent,
  getBlobServiceClient,
  storageDefaults,
  uploadFile,
} from '../lib/storage.js';

const { AzureWebJobsStorage, BLOB_CONTAINER_NAME } = process.env;

/**
 * isExpressRouteAlert
 * @summary returns true if the alertId indicates it's for the expressroute
 * @param  {Array} targetIds
 * @returns {boolean}
 */
export const isExpressRouteAlert = (targetIds) => {
  const result = targetIds.filter((targetId) =>
    targetId.toLowerCase().includes('expressroutecircuits')
  );
  return Boolean(result.length);
};

/**
 * whichPeer
 * @summary returns the peer that fired the alert
 * @param  {Array} dimensions
 * @returns {string} (e.g. "Primary-IPv4" or "Secondary-IPv4")
 */
export const whichPeer = (dimensions) => {
  const [result] = dimensions.filter(
    (dimension) => dimension.name.toLowerCase() === 'peer'
  );
  return result.value;
};

/**
 * getPeersStatus
 * @summary returns data from peers status file
 * @returns {string}
 */
export const getPeersStatus = async () => {
  const blobServiceClient = await getBlobServiceClient(AzureWebJobsStorage);
  const containerClient = await getBlobContainerClient(
    blobServiceClient,
    BLOB_CONTAINER_NAME || storageDefaults.blobContainerName
  );
  const blobContent = await getBlobContent(
    containerClient,
    storageDefaults.peersFileName
  );
  return blobContent;
};

/**
 * getPeerStatus
 * @summary returns status of an individual peer from peers status file
 * @param  {Object} [peersData=null]
 * @param  {string} [peer='Primary-IPv4']
 * @returns {Boolean} true/false === up/down
 */
export const getPeerStatus = async ({
  peersData = null,
  peer = 'Primary-IPv4',
}) => {
  if (!peersData) {
    peersData = await getPeersStatus();
  }
  return peersData[peer];
};

/**
 * setPeersStatus
 * @summary sets the full data object in peers status file
 * @param  {Object} peersData
 * @returns {void}
 */
export const setPeersStatus = async (peersData) => {
  await uploadFile({
    storageConnectionString: AzureWebJobsStorage,
    blobContainerName: BLOB_CONTAINER_NAME || storageDefaults.blobContainerName,
    fileContent: peersData,
    fileName: storageDefaults.peersFileName,
  });
};

/**
 * setPeerStatus
 * @summary updates status of an individual peer in peer status file
 * @param  {string} peer
 * @param  {boolean} status
 * @param  {Object} [peersData=null]
 * @returns {Object} peers status data object
 */
export const setPeerStatus = async ({ peer, status, peersData = null }) => {
  if (!peersData || peersData === undefined) {
    peersData = JSON.parse(await getPeersStatus());
  }
  peersData[peer] = Boolean(status);
  await setPeersStatus(peersData);
  const updatedStatus = await getPeersStatus();
  return updatedStatus;
};

/**
 * initPeersStatus
 * @summary looks for peer status file and creates one if not there
 * @returns {void}
 */
export const initPeersStatus = async () => {
  try {
    const currentStatus = await getPeersStatus();
    return currentStatus;
  } catch (error) {
    await setPeersStatus(storageDefaults.peersDefaultContent);
  }
};
