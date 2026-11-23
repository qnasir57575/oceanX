/**
 * One mock handler per operationId. The `MockHandlers` type requires an entry
 * for EVERY endpoint in the registry, so adding an endpoint without a mock is a
 * compile error.
 */
import type { MockHandlers } from "./helpers";
import * as auth from "./auth";
import * as content from "./content";
import * as discovery from "./discovery";
import * as workflow from "./workflow";

export const mockHandlers: MockHandlers = {
  // system & auth
  getHealth: auth.getHealth,
  register: auth.register,
  login: auth.login,
  logout: auth.logout,
  getSession: auth.getSession,
  changePassword: auth.changePassword,
  forgotPassword: auth.forgotPassword,
  resetPassword: auth.resetPassword,
  updateMyProfile: auth.updateMyProfile,
  // admin
  listUsers: auth.listUsers,
  createUser: auth.createUser,
  getUser: auth.getUser,
  updateUser: auth.updateUser,
  getAdminDashboard: auth.getAdminDashboard,
  listAuditLogs: auth.listAuditLogs,
  // home, search, taxonomy
  getHomePageData: discovery.getHomePageData,
  getPortalStats: discovery.getPortalStats,
  search: discovery.search,
  getSearchSuggestions: discovery.getSearchSuggestions,
  listCategories: discovery.listCategories,
  getCategory: discovery.getCategory,
  createCategory: discovery.createCategory,
  updateCategory: discovery.updateCategory,
  deleteCategory: discovery.deleteCategory,
  listKeywords: discovery.listKeywords,
  createKeyword: discovery.createKeyword,
  deleteKeyword: discovery.deleteKeyword,
  // content
  listExpeditions: content.listExpeditions,
  getExpedition: content.getExpedition,
  createExpedition: content.createExpedition,
  updateExpedition: content.updateExpedition,
  deleteExpedition: content.deleteExpedition,
  listPublications: content.listPublications,
  getPublication: content.getPublication,
  createPublication: content.createPublication,
  updatePublication: content.updatePublication,
  deletePublication: content.deletePublication,
  listDatasets: content.listDatasets,
  getDataset: content.getDataset,
  createDataset: content.createDataset,
  updateDataset: content.updateDataset,
  deleteDataset: content.deleteDataset,
  listMediaAssets: content.listMediaAssets,
  getMediaAsset: content.getMediaAsset,
  createMediaAsset: content.createMediaAsset,
  updateMediaAsset: content.updateMediaAsset,
  deleteMediaAsset: content.deleteMediaAsset,
  listActivities: content.listActivities,
  getActivity: content.getActivity,
  createActivity: content.createActivity,
  updateActivity: content.updateActivity,
  deleteActivity: content.deleteActivity,
  // files, submissions, AI, outreach
  createUpload: workflow.createUpload,
  putUploadContent: workflow.putUploadContent,
  completeUpload: workflow.completeUpload,
  getFile: workflow.getFile,
  downloadFile: workflow.downloadFile,
  deleteFile: workflow.deleteFile,
  createSubmission: workflow.createSubmission,
  listSubmissions: workflow.listSubmissions,
  getSubmission: workflow.getSubmission,
  reviewSubmission: workflow.reviewSubmission,
  withdrawSubmission: workflow.withdrawSubmission,
  generateResearchSummary: workflow.generateResearchSummary,
  generateOutreachContent: workflow.generateOutreachContent,
  listAIContent: workflow.listAIContent,
  getAIContent: workflow.getAIContent,
  updateAIContent: workflow.updateAIContent,
  deleteAIContent: workflow.deleteAIContent,
  listOutreach: workflow.listOutreach,
  getOutreach: workflow.getOutreach,
};
