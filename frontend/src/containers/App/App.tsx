import * as React from 'react';
import {
	Box,
	Button,
	Flex,
	HStack,
	List,
	ListItem,
	Progress,
	VStack,
	Heading,
	Text,
	Image,
	Collapse,
	Icon,
	useToast,
	useDisclosure,
} from '@chakra-ui/react';
import { GoChevronDown, GoChevronUp } from 'react-icons/go';
import styles from './App.module.scss';
import { Link, NavLink, Route, Switch, useLocation } from 'react-router-dom';
import { ChatbotList } from '../ChatbotList/ChatbotList';
import { Settings } from '../Settings/Settings';
import { CurrentUser, User } from '../../services/appConfig';
import { DemoChatbots } from '../DemoChatbots/DemoChatbots';
import { formatNumber } from '../../utils/commonUtils';
import { Users } from '../Users/Users';
import { UserProfile } from '../UserProfile/UserProfile';
import { useHistory } from 'react-router-dom';
import { PrivateRoute } from '../../components/PrivateRoute/PrivateRoute';
import EditChatbot from '../EditChatbot/EditChatbot';
import { InviteUsers } from '../Invite Users/InviteUsers';
import { InviteUsersHistory } from '../Invite Users/InviteUsersHistory';
import { MyProfile } from '../Users/MyProfile';
import { EmailTemplateSuperadmin } from '../EmailTemplateSuperadmin/EmailTemplateSuperadmin';
import { HiOutlineMailOpen } from 'react-icons/hi';
import { EmailCampaignsAdmin } from '../EmailCampaignsAdmin/EmailCampaignsAdmin';
import { PostmarkSettings } from '../UltimamailSettings/PostmarkSettings';
import { PostmarkSettingsHistory } from '../UltimamailSettings/PostmarkSettingsHistory';
import { SettingDetails } from '../UltimamailSettings/SettingDetails';
import nookies from 'nookies';
import iconEmailAssistant from '../../components/Icons/compaignm.svg';
import Dashboard from '../EmailAssistantAdmin/Dashboard/Dashboard';
import VoiceDashboard from '../VoiceAssistant/Dashboard/VoiceDashboard';
import AllMail from '../EmailAssistantAdmin/AllMail/AllMail';
import Notification from '../EmailAssistantAdmin/Notification/Notification';
import AssistantSettings from '../EmailAssistantAdmin/Settings/Settings';
import OtherMail from '../EmailAssistantAdmin/AllMail/OtherMail/OtherMail';
import ChatSummary from '../EmailAssistantAdmin/AllMail/ChatSummary/ChatSummary';
import LeadGenerated from '../EmailAssistantAdmin/AllMail/LeadGenerated/LeadGenerated';
import AutoReplies from '../EmailAssistantAdmin/AllMail/AutoReplies/AutoReplies';
import UserCreatedFolder from '../EmailAssistantAdmin/AllMail/UserCreatedFolder/UserCreatedFolder';
import CallRecords from '../VoiceAssistant/CallRecords';
import VoicebotSettings from '../VoiceAssistant/Settings/Settings';
import AllLeads from '../AllLeads/AllLeads';
import { ProjectsIcon } from '../../components/Icons/SideBarIcons/Projects';
import { LeadsIcon } from '../../components/Icons/SideBarIcons/LeadsIcon';
import { onMessage } from "firebase/messaging";
import { VoiceCampaigns } from '../VoiceAssistant/VoiceCampaigns';
import CreateCampaign from '../VoiceAssistant/Campaign/CreateCampaign';
import AddNumberAuth from '../VoiceAssistant/ContactNumber/AddNumberAuth';
import CallNumberHistory from '../VoiceAssistant/ContactNumber/CallNumberHistory';
import CallNumberHistoryDetails from '../VoiceAssistant/ContactNumber/CallNumberHistoryDetails';
import VoiceBotLeads from '../VoiceAssistant/VoiceBotLeads';
import GlobalDashboard from '../GlobalDashboard/GlobalDashboard';
import { GlobalDashboardIcon } from '../../components/Icons/SideBarIcons/GlobalDashboardIcon';
import { ZapierIcon } from '../../components/Icons/SideBarIcons/ZapierIcon';
import CreateWebhook from '../ZapierIntegration/CreateWebhook/CreateWebhook';
import ConnectWebhook from '../ZapierIntegration/ConnectWebhook/ConnectWebhook';
import UltimaReviewsCampaignList from '../UltimaReviewsCampaign/UltimaReviewsCampaignList';
import UltimaReviewsCreateCampaign from '../UltimaReviewsCampaign/UltimaReviewsCreateCampaign';
import UltimaReviewsCampaignUsers from '../UltimaReviewsCampaign/UltimaReviewsCampaignUsers';
import { fetchKnowledgebases } from '../../services/knowledgebaseService';
import SMTPSettings from '../UltimamailSettings/SMTPSettings';
import SMTPSettingsDetails from '../UltimamailSettings/SMTPSettingsDetails';
import { VakmangidsIcon } from '../../components/Icons/SideBarIcons/VakmangidsIcon';
import { UltimaReviewsIcon } from '../../components/Icons/SideBarIcons/UltimaReviewsIcon';
import Header from './AppLayout/Header';
import { CreateEmailCampaign } from '../EmailCampaignsAdmin/CreateEmailCampaign';
import CampaignDetails from '../EmailCampaignsAdmin/CampaignDetails';
import VoiceCampaignDetails from '../VoiceAssistant/VoiceCampaignDetails';
import { EditCampaignForm } from '../EmailCampaignsAdmin/Modal/EditCampaignForm';
import EmailWarmUp from '../EmailAssistantAdmin/Settings/EmailWarmUp';
import EmailWarmUpEdit from '../EmailAssistantAdmin/Settings/EmailWarmUpEdit';
import { callApi } from '../../services/callApi';
import AdminSettings from '../AdminSettings/AdminSettings';
import { generateToken, messaging } from '../Notifications/firebase';
import { InboundVoiceList } from '../InboundVoiceAssistant/InboundVoiceList';
import { CreateNewInbound } from '../InboundVoiceAssistant/CreateNewInbound';
import InboundDetails from '../InboundVoiceAssistant/InboundDetails';
import AnotherTabMessage from './AnotherTabMessage';
import { ChatbotListNew } from '../ChatbotList/ChatbotListNew';
import EditChatbotNew from '../EditChatbot/EditChatbotNew';
import { useDispatch, useSelector } from 'react-redux';
import { getProfileRequest } from '../../redux/actions/globalActions';
import EligibilityGuard from '../AdminSettings/EligibilityGuard';
import { AllInvoices } from '../Users/AllInvoices';
import VekmangidsChatbot from '../EditChatbot/VekmangidsChatbot';
import AppSidebar from './AppSidebar';
import OpenAIUsage from '../OpenAIUsage/OpenAIUsage';
import { hasOpenAIUsageAccess } from '../../config/openAiUsageConfig';

interface AppProps {
	onLoginOut: () => void;
}


export const App = (props: AppProps) => {
	const [isZapierOpen, setIsZapierOpen] = React.useState<boolean>(false);
	const cookies = nookies.get(null);
	const toast = useToast()
	let userPresent = cookies.accesstoken;
	const location = useLocation();
	const currentPath = window.location.pathname;
	const isInbound = currentPath.startsWith('/app/inbound-voice-calls/create');
	const isEmailCaompaign = currentPath.includes("/app/email-campaigns/create");
	const headerbaseSteps = isInbound ? [
		{ label: "Set-up", status: "active" },
		{ label: "Prompt", status: "upcoming" },
		{ label: "Successfully Create", status: "upcoming" },
	] : [
		{ label: "Set-up", status: "active" },
		{ label: "Target Audience", status: "upcoming" },
		{ label: currentPath.includes("/app/email-campaigns/create") ? "Set-up Review" : "Prompt", status: "upcoming" },
		{ label: "Complete Campaign", status: "upcoming" },
	]
	const [headerSteps, setHeaderSteps] = React.useState<any>(headerbaseSteps);
	const { isOpen, onOpen, onClose } = useDisclosure();

	React.useEffect(() => {
		setHeaderSteps(headerbaseSteps);
	}, [isInbound, isEmailCaompaign]);


	React.useEffect(() => {
		// Service worker register karo
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/firebase-messaging-sw.js')
				.then((registration) => {
					// console.log('Service Worker registered:', registration);
				})
				.catch((error) => {
					// console.log('Service Worker registration failed:', error);
				});
		}
	}, []);

	const isFcmExits = sessionStorage.getItem("fcmToken");

	React.useEffect(() => {
		setTimeout(() => {
			// console.log("isFcmExits", isFcmExits);
			if (isFcmExits) return
			// console.log("isFcmExits", isFcmExits);
			generateToken();
			onMessage(messaging, (payload: any) => {
				// console.log(messaging, "messaging", payload);
				toast({
					title: "test",
					status: "success",
					isClosable: true,
				});
			});

		}, 2000);
	}, []);

	React.useEffect(() => {
		const handleStorage = (event: StorageEvent) => {
			if (event.key === "userLoggedIn") {
				// console.log("User logged in from another tab");
				onOpen()
			}
		};

		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);


	const queryParams = new URLSearchParams(location.search);
	const subTab = queryParams.get("subTab"); // e.g., 'set-up-review'

	const formattedSubTab = subTab?.replace(/-/g, " ").toLowerCase(); // => 'step up review'

	React.useEffect(() => {
		// if (!formattedSubTab) return;

		setHeaderSteps((prevSteps: any[]) => {
			let activeIndex = prevSteps.findIndex(step =>
				step.label.toLowerCase().includes(formattedSubTab)
			);

			// If no match found, don't change anything
			if (activeIndex === -1) return prevSteps;

			// Update steps based on position
			return prevSteps.map((step, index) => {
				if (index < activeIndex) {
					return { ...step, status: "complete" };
				} else if (index === activeIndex) {
					return { ...step, status: "active" };
				} else {
					return { ...step, status: "upcoming" };
				}
			});
		});

	}, [subTab]);
	const history = useHistory();

	const handleHeaderSteps = (actionType: string) => {
		// console.log("actionType", actionType);
		if (actionType === "reset") {
			setHeaderSteps(headerbaseSteps);
		} else {
			setHeaderSteps((prevSteps: any[]) => {
				// Find the current active step index
				const currentIndex = prevSteps.findIndex((step) => step.status === "active");

				// Calculate the new index based on action
				let newIndex = actionType === "next" ? currentIndex + 1 : currentIndex - 1;

				// Ensure it stays within bounds
				if (newIndex < 0 || newIndex >= prevSteps.length) return prevSteps;

				// Update statuses
				return prevSteps.map((step, index) => {

					if (index < newIndex) return { ...step, status: "complete" };
					if (index === newIndex) return { ...step, status: "active" };
					return { ...step, status: "upcoming" };
				});
			});

		}
	};
	// States for each dropdown
	const [isCampaignManagerOpen, setIsCampaignManagerOpen] =
		React.useState(false);
	const [isUltimaMailOpen, setIsUltimaMailOpen] = React.useState(false);
	const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);
	const [isEmailSection, setEmailSection] = React.useState(false);
	const [isVoiceBotOpen, setIsVoiceBotOpen] = React.useState(false);
	const [isProjectCount, setProjectCount] = React.useState<number>(0);
	const [isAuthenticated, setIsAuthenticated] = React.useState(!!userPresent);
	const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
	const [isSettingsEnabled, setisSettingsEnabled] = React.useState({ isVapiVerified: false });
	const [isUserDeleted, setUserDeleted] = React.useState(false)
	const userProfile = useSelector((state: any) => state.user?.profile) || {}
	const dispatch = useDispatch()
	const prevCampaignManagerOpen = React.useRef(isCampaignManagerOpen);
	const prevZapierOpen = React.useRef(isZapierOpen);
	async function fetchData() {
		try {
			const responseProjectName = await fetchKnowledgebases(1, 10); // Replace with your API endpoint
			setProjectCount(responseProjectName?.data?.pagination?.totalItems);
		} catch (error) {
			// console.log(error);
		}
	}

	// call API only once
	React.useEffect(() => {
		// if (!userProfile?.role) {
		dispatch(getProfileRequest())
		// }
	}, [userProfile?._id])

	// run logic when profile is available
	React.useEffect(() => {
		if (userProfile?.role) {
			fetchData()
			CurrentUser.set(userProfile)
			setUserDeleted(userProfile?.gdpr?.isDeleted || false)
		}
	}, [userProfile?.role])

	let checkUserEligibility = ((!userProfile?.openaiKeys?.apiKey) && (!userProfile?.openaiKeys?.useOwnKey) && userProfile?.role == "user")


	const editChatbotPath = React.useMemo(() => '/app/edit-bot/:chatbotId', []);
	const editChatbotPathNew = React.useMemo(() => '/app/edit-chatbot/:chatbotId', []);
	const vakmangidsChatbotPath = React.useMemo(() => '/app/vakmangids-chatbot/:chatbotId/', []);


	// Menu items for each section
	const ultimamailItems = userProfile?.role == "user" ? [
		{ name: 'Create Campaign', path: '/app/email-campaigns' },
	] : [
		{ name: 'Create Campaign', path: '/app/email-campaigns' },
		{ name: 'Postmark Settings', path: '/app/postmark-settings' },
		// { name: 'SMTP Settings', path: '/app/smtp-settings/details' },
	];

	const zapierItems = [
		{ name: 'Receive leads from Zapier', path: '/app/zapier/create-webhook' },
		{ name: 'Send leads from Zapier', path: '/app/zapier/connect-webhook' },
	];

	const menuItemsAssistant = [
		{ name: 'Dashboard', path: '/app/email-assistant/dashboard' },
		// { name: 'Email Management', path: '/app/email/email-conversation' },
		{ name: 'Notifications', path: '/app/email-assistant/notifications' },
		{ name: 'Settings', path: '/app/email-assistant/settings' },
	];


	const fetchVapiVerificationStatus = async () => {
		try {
			// console.log("response check run");
			const response = await callApi("voicebot/check-project-and-number", "get", "")
			// console.log("response", response);
			setisSettingsEnabled(response.data)
		} catch (error) {
			// console.log(error);
		}
	}

	React.useEffect(() => {
		fetchVapiVerificationStatus()
	}, [])

	const menuItemsvoiceAssistant = [
		{ name: 'Dashboard', path: '/app/voice-campaign/dashboard', disabled: true },
		{ name: 'Leads', path: '/app/voice-campaign/voicebot-leads', disabled: true },
		// { name: "Campaign", path: "/app/voice-campaign" },
		{
			name: "Outbound VoiceBot",
			path: "/app/voice-campaign",
			isActive: (currentPath: string) => currentPath === "/app/voice-campaign" || currentPath === "/app/voice-campaign/create" || currentPath === "/app/voice-campaign/call-records/:id" || currentPath.startsWith('/app/voice-campaign/campaign-details') || currentPath.startsWith('/app/voice-campaign/edit/')
			, disabled: true
		},
		{
			name: 'Inbound VoiceBot', path: '/app/inbound-voice-calls',
			isActive: (currentPath: string) => currentPath === "/app/inbound-voice-calls" || currentPath.startsWith('/app/inbound-voice-calls/create') || currentPath.startsWith('/app/inbound-voice-calls')
			, disabled: true
		},
		{
			name: 'Number', path: '/app/voice-campaign/add-number',
			isActive: (currentPath: string) => currentPath === "/app/voice-campaign/number-history" || currentPath === "/app/voice-campaign/add-number" || currentPath.startsWith('/app/voice-campaign/number-history-details')
			, disabled: true
		},
		{ name: 'Settings', path: '/app/voice-campaign/settings', disabled: isSettingsEnabled?.isVapiVerified || false },
	];

	const getActiveClass = (item: any) => {
		const active = item.isActive
			? item.isActive(currentPath)
			: currentPath === item.path;

		if (!active) return "";

		return isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed;
	};
	const isActiveEmailPath = (path: string) => currentPath?.includes(path);

	const getActiveClassForEmail = (path: string) => {
		if (!isActiveEmailPath(path)) return "";
		return isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed;
	};

	const isSmtpSettingsActive = () => {
		return currentPath?.includes("/app/smtp-settings");
	};

	const isActiveAssistantPath = (path: string) => currentPath === path;

	const getActiveClassForAssistant = (path: string) => {
		if (!isActiveAssistantPath(path)) return "";
		return isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed;
	};

	React.useEffect(() => {
		const tabId = localStorage.getItem("tabId");

		const updateActivity = () => {
			localStorage.setItem("activeTab", JSON.stringify({
				tabId,
				url: window.location.href,
				timestamp: Date.now(),
			}));
		};

		// Update every 3 seconds
		updateActivity();
		const interval = setInterval(updateActivity, 3000);

		return () => clearInterval(interval);
	}, []);


	// Initialize dropdown states based on current path
	React.useEffect(() => {
		if (
			!currentPath.includes('/app/voice-campaign') &&
			!currentPath.includes('/app/email-assistant') &&
			!currentPath.includes('/app/email-campaigns') &&
			!currentPath.includes('/app/email-warmup') &&
			!currentPath.includes('/app/smtp-settings') &&
			!currentPath.includes('/app/postmark-settings') &&
			!currentPath.includes('/app/inbound-voice-calls') &&
			!currentPath.includes('/app/chatbots') &&
			!currentPath.includes('/app/edit-chatbot/')
		) {
			setIsVoiceBotOpen(false);
			setEmailSection(false);
			setIsUltimaMailOpen(false);
			setIsAssistantOpen(false);
		}

		// Check if the path contains voice-campaign
		if (currentPath.includes("/app/voice-campaign")) {
			setIsCampaignManagerOpen(true);
			setIsVoiceBotOpen(true);
		}
		if (currentPath.includes("/app/smtp-settings/details")
			|| currentPath.includes("/app/email-warmup")) {
			setEmailSection(true);
			setIsCampaignManagerOpen(true);

		}
		if (currentPath.includes("app/email-assistant") || currentPath.includes("/app/email/email-conversation") ||
			currentPath.includes("/app/email-conversation")
		) {
			setEmailSection(true);
			// setIsCampaignManagerOpen(true);

		}

		// Check for email assistant paths
		if (currentPath.includes("/app/chatbots")) {
			setIsCampaignManagerOpen(true);
			// setIsAssistantOpen(true);
		}
		if (currentPath.includes("/app/email-assistant")) {
			setIsCampaignManagerOpen(true);
			setIsAssistantOpen(true);
		}
		if (currentPath == "/app/email/email-conversation") {
			setEmailSection(true);
			setIsAssistantOpen(false);
		}

		if ((currentPath.includes("/app/email-campaigns") ||
			currentPath.includes("/app/postmark-settings") ||
			currentPath.includes("/app/email-campaigns/campaign-details")) &&
			!currentPath.includes("/app/smtp-settings")) {
			setEmailSection(true);
			setIsCampaignManagerOpen(true);
			setIsUltimaMailOpen(true);
		}

		// Handle SMTP settings separately
		if (currentPath.includes("/app/smtp-settings")) {
			setEmailSection(true);
			setIsCampaignManagerOpen(true);
			setIsUltimaMailOpen(false); // Close Email Outreach dropdown
		}

		// Check for zapier paths - this is already in your original code
		if (currentPath === '/app/zapier/create-webhook' || currentPath === '/app/zapier/connect-webhook') {
			setIsZapierOpen(true);
		}
	}, [currentPath]);


	React.useEffect(() => {
		if ((isProjectCount < 1) || isUserDeleted) {
			setIsCampaignManagerOpen(false);
			setIsZapierOpen(false);
		} else {
			setIsCampaignManagerOpen(true);
			setIsZapierOpen(true);

		}
	}, [isProjectCount, isUserDeleted]);

	React.useEffect(() => {
		if (currentPath === '/app/zapier/create-webhook' || currentPath === '/app/zapier/connect-webhook') {
			setIsZapierOpen(true);
		}
	}, [currentPath]);
	return (
		<VStack spacing="0" w="100%" h="100vh">
			{/* this is the header */}
			<AnotherTabMessage isOpen={isOpen} onOpen={onOpen} onClose={onClose} />
			<Header
				headerSteps={headerSteps}
				userData={userProfile}
				handler={() => {
					const opening = !isSidebarOpen;
					setIsSidebarOpen(opening);
					if (opening) {
						// Restore previous states when reopening
						setIsZapierOpen(prevZapierOpen.current);
						setIsCampaignManagerOpen(prevCampaignManagerOpen.current);
					} else {
						// Save current states before closing
						prevCampaignManagerOpen.current = isCampaignManagerOpen;
						prevZapierOpen.current = isZapierOpen;
						setIsZapierOpen(false);
						setIsCampaignManagerOpen(false);
					}
				}}
			/>
			<Flex flex={1}
				boxShadow="0 1px 3px 0 rgba(0, 0, 0, 0.1),0 1px 2px 0 rgba(0, 0, 0, 0.06)"
				h="calc(100% - 100px)" w="100%">
				<HStack spacing="0" w="100%" justify="start">
					{/* this is the sidebar */}
					<AppSidebar
						isSidebarOpen={isSidebarOpen}
						userProfile={userProfile}
						isProjectCount={isProjectCount}
						isUserDeleted={isUserDeleted}
						isSettingsEnabled={isSettingsEnabled}
						checkUserEligibility={checkUserEligibility}
						setIsSidebarOpen={setIsSidebarOpen}
					/>
					<Switch>

						<Route exact path="/">
							<GlobalDashboard />
						</Route>

						<EligibilityGuard
							path="/app/all-leads"
							component={<AllLeads />}
							checkUserEligibility={checkUserEligibility}
						/>
						<EligibilityGuard
							path="/app/chatbots"
							component={<ChatbotListNew />}
							checkUserEligibility={checkUserEligibility}
						/>
						<EligibilityGuard
							path="/app/dashboard"
							component={<GlobalDashboard />}
							checkUserEligibility={checkUserEligibility}
						/>
						<EligibilityGuard
							path="/app/bots"
							component={<ChatbotList setProjectCount={setProjectCount} />}
							checkUserEligibility={checkUserEligibility}
						/>
						<Route exact path="/app/subscription">
							<Settings />
						</Route>
						<Route exact path="/app/myprofile">
							<MyProfile />
						</Route>
						<Route exact path="/app/all-invoices">
							<AllInvoices />
						</Route>
						{/* <Route exact path="/app/settings">
							<AdminSettings />
						</Route> */}
						<Route exact path="/app/inbound-voice-calls">
							<InboundVoiceList />
						</Route>
						<Route exact path="/app/inbound-voice-calls/create">
							<CreateNewInbound handleHeaderSteps={handleHeaderSteps} headerSteps={headerSteps} />
						</Route>
						<Route exact path="/app/inbound-voice-calls/edit/:id">
							<CreateNewInbound handleHeaderSteps={handleHeaderSteps} headerSteps={headerSteps} />
						</Route>
						<Route exact path="/app/inbound-voice-calls/details/:id">
							<InboundDetails />
						</Route>
						<Route exact path="/app/email-campaigns">
							<EmailCampaignsAdmin />
						</Route>
						<Route exact path="/app/email-campaigns/campaign-details/:id">
							<CampaignDetails />
						</Route>
						<Route exact path="/app/email-campaigns/create">
							<CreateEmailCampaign handleHeaderSteps={handleHeaderSteps} headerSteps={headerSteps} />
						</Route>
						<Route exact path="/app/email-campaigns/edit/:id">
							<EditCampaignForm />
						</Route>
						{/* <Route exact path="/app/leadsHistory">
							<LeadsHistory />
						</Route> */}
						<Route exact path="/app/postmark-settings">
							<PostmarkSettings />
						</Route>
						<Route exact path="/app/email-warmup">
							<EmailWarmUp />
						</Route>

						{/* <Route exact path="/app/email-warmup/edit/:id">
							<EmailWarmUpEdit />
						</Route> */}
						<Route exact path="/app/postmark-settings-history">
							<PostmarkSettingsHistory />
						</Route>
						<Route exact path="/app/postmark-settings-details/:id">
							<SettingDetails />
						</Route>
						<Route exact path="/app/smtp-settings/create">
							<SMTPSettings />
						</Route>
						<Route exact path="/app/smtp-settings/details">
							<SMTPSettingsDetails />
						</Route>
						<Route exact path="/app/email-assistant/dashboard">
							<Dashboard />
						</Route>
						<Route exact path="/app/email/email-conversation">
							<AllMail />
						</Route>
						<Route exact path="/app/email-conversation/:id/email-summary">
							<ChatSummary />
						</Route>
						<Route exact path="/app/email-conversation/:id/leads-generated">
							<LeadGenerated />
						</Route>
						<Route exact path="/app/email-conversation/leads-generated">
							<LeadGenerated />
						</Route>
						<Route exact path="/app/email-conversation/:id/auto-replies">
							<AutoReplies />
						</Route>
						<Route exact path="/app/email-conversation/:id/:mailType">
							<OtherMail />
						</Route>
						<Route
							exact
							path="/app/email-conversation/folder/user-created/:id/:mailType"
						>
							<UserCreatedFolder />
						</Route>
						<Route exact path="/app/email-assistant/notifications">
							<Notification />
						</Route>
						<Route exact path="/app/email-assistant/settings">
							<AssistantSettings />
						</Route>
						<Route exact path="/app/voice-campaign">
							<VoiceCampaigns />
						</Route>
						<Route exact path="/app/voice-campaign/campaign-details/:id">
							<VoiceCampaignDetails />
						</Route>
						<Route exact path="/app/voice-campaign/call-records/:id">
							<CallRecords />
						</Route>
						<Route exact path="/app/voice-campaign/call-records">
							<CallRecords />
						</Route>
						<Route exact path="/app/voice-campaign/dashboard">
							<VoiceDashboard />
						</Route>
						<Route exact path="/app/voice-campaign/voicebot-leads">
							<VoiceBotLeads />
						</Route>
						<Route exact path="/app/voice-campaign/settings">
							<VoicebotSettings />
						</Route>
						<Route exact path="/app/voice-campaign/create">
							<CreateCampaign handleHeaderSteps={handleHeaderSteps} headerSteps={headerSteps} />
						</Route>
						<Route exact path="/app/voice-campaign/edit/:id">
							<CreateCampaign handleHeaderSteps={handleHeaderSteps} headerSteps={headerSteps} />
						</Route>
						<Route exact path="/app/voice-campaign/add-number">
							<AddNumberAuth callUpdateApi={fetchVapiVerificationStatus} />
						</Route>
						<Route exact path="/app/voice-campaign/number-history">
							<CallNumberHistory />
						</Route>
						<Route exact path="/app/voice-campaign/number-history-details/:id">
							<CallNumberHistoryDetails />
						</Route>
						<Route exact path="/app/zapier/create-webhook">
							<CreateWebhook />
						</Route>
						<Route exact path="/app/zapier/connect-webhook">
							<ConnectWebhook />
						</Route>
						<PrivateRoute
							isAuthenticated={isAuthenticated}
							exact
							path={editChatbotPath}
							component={EditChatbot}
						/>
						<PrivateRoute
							isAuthenticated={isAuthenticated}
							exact
							path={editChatbotPathNew}
							component={EditChatbotNew}
						/>
						<PrivateRoute
							isAuthenticated={isAuthenticated}
							exact
							path={vakmangidsChatbotPath}
							component={VekmangidsChatbot}
						/>
						{/* <Route exact path="/">
							<ChatbotList />
						</Route> */}
						{/* <ChatbotList /> */}
					</Switch>
					{/* )} */}
					{/* <Switch>
					</Switch> */}

					{/* userProfile && (userProfile.role === 'admin' && userProfile.email === 'gopal@gmail.com') && ( */}
					{userProfile && userProfile.role === 'admin' && (
						<Switch>

							<Route exact path="/app/bots-demo">
								<DemoChatbots />
							</Route>
							<Route exact path="/app/inviteUsers">
								<InviteUsers />
							</Route>
							<Route exact path="/app/email-templates">
								<EmailTemplateSuperadmin />
							</Route>
							<Route exact path="/app/inviteUsers/usersHistory">
								<InviteUsersHistory />
							</Route>

							<Route exact path="/app/users">
								<Users />
							</Route>
							<Route exact path="/app/users/profile/:userId">
								<UserProfile />
							</Route>
							<Route exact path="/app/ultima-reviews/campaign">
								<UltimaReviewsCampaignList />
							</Route>
							<Route exact path="/app/ultima-reviews/campaign/:id/users">
								<UltimaReviewsCampaignUsers />
							</Route>
							<Route exact path="/app/ultima-reviews/campaign/all-users">
								<UltimaReviewsCampaignUsers />
							</Route>
							<Route exact path="/app/ultima-reviews/campaign/create">
								<UltimaReviewsCreateCampaign />
							</Route>
							{userProfile && hasOpenAIUsageAccess(userProfile) && (
								<Route exact path="/app/open-ai-usage">
									<OpenAIUsage />
								</Route>
							)}
							{/* <Route exact path="/app/settings">
									<AdminSettings />
								</Route> */}

						</Switch>
					)}
				</HStack >
			</Flex >
		</VStack >
	);
};