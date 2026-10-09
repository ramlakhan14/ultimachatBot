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
  color,
} from '@chakra-ui/react';
import { GoChevronDown, GoChevronUp } from 'react-icons/go';
import styles from './App.module.scss';
import { Link, NavLink, Route, Switch, useLocation } from 'react-router-dom';
import { UserProfile } from '../UserProfile/UserProfile';
import { useHistory } from 'react-router-dom';
import nookies from 'nookies';
import { ProjectsIcon } from '../../components/Icons/SideBarIcons/Projects';
import { LeadsIcon } from '../../components/Icons/SideBarIcons/LeadsIcon';
import { onMessage } from "firebase/messaging";
import { GlobalDashboardIcon } from '../../components/Icons/SideBarIcons/GlobalDashboardIcon';
import { ZapierIcon } from '../../components/Icons/SideBarIcons/ZapierIcon';
import { VakmangidsIcon } from '../../components/Icons/SideBarIcons/VakmangidsIcon';
import { UltimaReviewsIcon } from '../../components/Icons/SideBarIcons/UltimaReviewsIcon';
import { generateToken, messaging } from '../Notifications/firebase';
import { isOpenAIUsageEmail } from '../../config/openAiUsageConfig';



interface UserProfile {
  role?: "admin" | "user";
  email?: string;
}

interface SettingsEnabled {
  isVapiVerified?: boolean;
}

interface SidebarItem {
  name: string;
  path: string;
  disabled?: boolean;
}

interface AppSidebarProps {
  isSidebarOpen?: boolean;
  userProfile?: UserProfile;
  isProjectCount?: number;
  isUserDeleted?: boolean;
  isSettingsEnabled?: SettingsEnabled;
  checkUserEligibility: any,
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({
  isSidebarOpen = true,
  userProfile,
  isProjectCount = 0,
  isUserDeleted = false,
  isSettingsEnabled,
  checkUserEligibility,
  setIsSidebarOpen
}) => {

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


  React.useEffect(() => {
    setIsZapierOpen(isSidebarOpen)
    setIsCampaignManagerOpen(isSidebarOpen)
    // console.log("isSidebarOpen only", isSidebarOpen);
  }, [isSidebarOpen]);


  React.useEffect(() => {
    if (!isSidebarOpen) {
      setIsZapierOpen(false);
      setIsCampaignManagerOpen(false);
    }
  }, [currentPath, isSidebarOpen]);

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

  const history = useHistory();


  // States for each dropdown
  const [isCampaignManagerOpen, setIsCampaignManagerOpen] =
    React.useState(false);
  const [isUltimaMailOpen, setIsUltimaMailOpen] = React.useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);
  const [isEmailSection, setEmailSection] = React.useState(false);
  const [isVoiceBotOpen, setIsVoiceBotOpen] = React.useState(false);
  const prevCampaignManagerOpen = React.useRef(isCampaignManagerOpen);
  const prevZapierOpen = React.useRef(isZapierOpen);
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
    <>
      <Flex
        // onMouseOver={() => setIsSidebarOpen(true)}
        // onMouseLeave={() => setIsSidebarOpen(false)}
        className={styles.sidebar}
        sx={{
          height: '100%',
          width: isSidebarOpen ? '260px' : '60px',
          padding: "15px",
          background: "white",
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          gap: '10px',
          overflowY: 'auto',
          "::-webkit-scrollbar": {
            display: isSidebarOpen ? "block" : "none",
          },
          "::-webkit-scrollbar-track": {
            display: "none",
          }
        }}
        shadow="base"
        flexShrink={0}
      >
        <List
          spacing={2}
          pointerEvents={checkUserEligibility ? "none" : "auto"}
          opacity={checkUserEligibility ? 0.5 : 1}
          className='new-dashboard'

        >
          <>
            <ListItem marginLeft={"-3px"} display="flex" alignItems="center" fontSize="sm" onClick={() => {
              setIsSidebarOpen(true)
            }}
            >
              <NavLink
                to="/app/dashboard"
                activeClassName={isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed}
                style={{
                  padding: isSidebarOpen ? "8px 16px" : "4px",
                  backgroundColor: currentPath === '/app/dashboard' ? '#E8F1FA' : 'transparent',
                  color: currentPath === '/app/dashboard' ? '#1976D2' : '#454545',

                }}
              // isActive={(match, location) =>
              //   !!match || location.pathname === '/app/dashboard'
              // }
              >
                <Flex alignItems="center"
                  _hover={{ color: "#1976D2" }}
                >

                  {/* <GlobalDashboardIcon fill={"#2977FF"} /> */}
                  <Image src="/icons/ic-dashboard.svg" alt="Ultima Reviews" width="24px" height="24px" />

                  <Text as="span" fontSize="14px"
                    fontWeight="600 !important" display={isSidebarOpen ? "" : "none"} style={{ transition: "0.3s", marginLeft: '10px' }}>
                    Dashboard
                  </Text>
                </Flex>
              </NavLink>
            </ListItem>

            <ListItem
              marginLeft={"-3px"}
              display="flex"
              alignItems="center"
              fontSize="sm"
              onClick={() => {
                setIsSidebarOpen(true);
              }}
            >
              {isUserDeleted ? (
                <Flex
                  alignItems="center"
                  opacity={0.5}
                  cursor="not-allowed"
                  pointerEvents="none"
                >
                  {/* <ProjectsIcon /> */}
                  <Image src="/icons/ic-projects-2.svg" alt="Ultima Reviews" width="24px" height="24px" />

                  <Text
                    as="span"
                    fontSize="14px"
                    fontWeight="600 !important"
                    display={isSidebarOpen ? "" : "none"}
                    transition="0.3s"
                    ml="10px"
                    textDecoration={"none"}
                    _hover={{
                      textDecoration: "none",
                      color: "#7C2FF1"
                    }}
                  >
                    Projects
                  </Text>
                </Flex>
              ) : (
                <NavLink
                  activeClassName={isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed}
                  style={{
                    padding: isSidebarOpen ? "8px 16px" : "4px",
                    borderRadius: isSidebarOpen ? "20px" : "6px",
                    backgroundColor: currentPath.startsWith('/app/edit-bot/') || currentPath === '/app/bots' ? '#F2EAFE' : 'transparent',
                    color: currentPath.startsWith('/app/edit-bot/') || currentPath === '/app/bots' ? '#7C2FF1' : '#454545',
                  }}
                  to="/app/bots"
                >
                  <Flex alignItems="center" _hover={{
                    textDecoration: "none",
                    color: "#7C2FF1"
                  }}>

                    <Image src="/icons/ic-projects-2.svg" alt="Ultima Reviews" width="24px" height="24px" />
                    <Text
                      as="span"
                      textDecoration={"none"}
                      _hover={{
                        textDecoration: "none",
                        color: "#7C2FF1"
                      }}
                      fontSize="14px"
                      fontWeight="600 !important"
                      display={isSidebarOpen ? "" : "none"}
                      transition="0.3s"
                      ml="10px"
                    >
                      Projects
                    </Text>
                  </Flex>
                </NavLink>
              )}
            </ListItem>


            {userProfile?.role === 'admin' ? (
              <ListItem marginLeft={"-3px"} display="flex" alignItems="center" fontSize="sm">
                <NavLink
                  activeClassName={isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed}
                  style={{
                    padding: isSidebarOpen ? "8px 16px" : "6px",
                    textDecoration: "none",
                    backgroundColor: currentPath.includes("/app/ultima-reviews/campaign") ? '#E8F1FA' : 'transparent',
                    color: currentPath.includes("/app/ultima-reviews/campaign") ? '#1976D2' : '#454545',
                  }}
                  to="/app/ultima-reviews/campaign"
                >
                  <Flex alignItems="center" _hover={{ color: "#1976D2" }}>
                    <Image src="/icons/reviewSales.svg" alt="Ultima Reviews" width="24px" height="24px" />
                    {isSidebarOpen &&
                      <span style={{ marginLeft: '8px', fontWeight: 600 }}

                      >UltimaReviews Sales</span>
                    }
                  </Flex>
                </NavLink>
              </ListItem>
            ) : null}

            <ListItem
              display="flex"
              alignItems="center"
              fontSize="sm"
              marginLeft={"-3px"}
              onClick={() => {
                setIsSidebarOpen(true)
              }}
            >
              {isUserDeleted ? (
                // disabled state
                <Flex
                  alignItems="center"
                  opacity={0.5}
                  cursor="not-allowed"
                  pointerEvents="none"
                  _hover={{ color: "#F59E0B" }}
                >
                  {/* <LeadsIcon /> */}
                  <Image src="/icons/ic-leads.svg" alt="Zapier" width="24px" height="24px" />

                  <Text
                    as="span"
                    fontSize="14px"
                    fontWeight="600 !important"
                    display={isSidebarOpen ? "" : "none"}
                    transition="0.3s"
                    ml="10px"
                    textDecoration={"none"}
                    _hover={{
                      textDecoration: "none"
                    }}
                  >
                    Leads
                  </Text>
                </Flex>
              ) : (
                // active NavLink
                <NavLink
                  to="/app/all-leads"
                  activeClassName={isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed}
                  style={{
                    padding: !isSidebarOpen && !currentPath.includes("/app/all-leads") ? "5px 3px" : isSidebarOpen ? "8px 16px" : "5px",
                    // padding: !isSidebarOpen ? "5px" : "unset",
                    textDecoration: "none",
                    backgroundColor: currentPath.includes("/app/all-leads") ? '#FEF5E6' : 'transparent',
                    color: currentPath.includes("/app/all-leads") ? '#F59E0B' : '#454545',
                  }}
                >

                  <Flex alignItems="center" _hover={{ color: "#F59E0B" }}>
                    {/* <LeadsIcon /> */}
                    <Image src="/icons/ic-leads.svg" alt="Zapier" width="24px" height="24px" />

                    <Text
                      as="span"
                      fontSize="14px"
                      fontWeight="600 !important"
                      display={isSidebarOpen ? "" : "none"}
                      transition="0.3s"
                      ml="10px"
                      textDecoration={"none"}
                      _hover={{
                        textDecoration: "none"
                      }}
                    >
                      Leads
                    </Text>
                  </Flex>
                </NavLink>
              )}
            </ListItem>


            <Box
              minW={isSidebarOpen ? "200px" : "0px"}
              marginTop={"0px!important"}
              marginLeft={"-3px"}
            >
              <Box>
                <Button
                  width={"100%"}
                  minW={isSidebarOpen ? "100%" : "33px"}
                  maxH={isSidebarOpen ? "100%" : "35px"}
                  borderRadius={isSidebarOpen ? "20px!important" : "6px!important"}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  onClick={() => {
                    setIsSidebarOpen(true)
                    setIsCampaignManagerOpen(!isCampaignManagerOpen);
                    setIsUltimaMailOpen(false);
                    setIsAssistantOpen(false);
                    setIsVoiceBotOpen(false);
                    setEmailSection(false);
                  }}
                  variant="unstyled"
                  _focus={{ outline: 'none' }}
                  disabled={(isProjectCount < 1) || isUserDeleted}
                  padding={"7px 16px"}
                  style={{
                    padding: isSidebarOpen ? "8px 16px" : "5px",
                    textDecoration: "none",
                    backgroundColor: currentPath?.includes('/app/chatbots') ||
                      currentPath?.includes('/app/voice-campaign') ||
                      currentPath?.includes('/app/smtp-settings') ||
                      currentPath?.includes('/app/email-warmup') ||
                      currentPath?.includes('/app/email-campaigns') ||
                      currentPath?.includes('/app/postmark-settings') ||
                      currentPath?.includes('/app/inbound-voice-calls') ||
                      currentPath?.includes('/app/email-assistant') ||
                      currentPath?.includes('/app/edit-chatbot/') ? '#EFEFFE' : 'transparent',
                    color: currentPath?.includes('/app/chatbots') ||
                      currentPath?.includes('/app/voice-campaign') ||
                      currentPath?.includes('/app/smtp-settings') ||
                      currentPath?.includes('/app/email-warmup') ||
                      currentPath?.includes('/app/email-campaigns') ||
                      currentPath?.includes('/app/postmark-settings') ||
                      currentPath?.includes('/app/inbound-voice-calls') ||
                      currentPath?.includes('/app/email-assistant') ||
                      currentPath?.includes('/app/edit-chatbot/') ? '#6366F1' : '#454545',
                  }}
                >
                  <Box display="flex" alignItems="center"
                    gap={2}
                    _hover={{ color: "#6366F1" }}
                  >

                    {/* ic-campaign_manager */}
                    <Image src="/icons/ic-campaign_manager.svg" alt="Zapier" width="24px" height="24px" />

                    <Text as="span" fontSize="14px"
                      fontWeight="600 !important"
                      color={(currentPath?.includes('/app/chatbots') ||
                        currentPath?.includes('/app/voice-campaign') ||
                        currentPath?.includes('/app/smtp-settings') ||
                        currentPath?.includes('/app/email-warmup') ||
                        currentPath?.includes('/app/email-campaigns') ||
                        currentPath?.includes('/app/postmark-settings') ||
                        currentPath?.includes('/app/inbound-voice-calls') ||
                        currentPath?.includes('/app/email-assistant')) ||
                        currentPath?.includes('/app/edit-chatbot/')
                        ? "#6366F1"
                        : "#454545"}

                      display={isSidebarOpen ? "" : "none"} >
                      {/* Campaign Manager */}
                      Tools
                    </Text>
                  </Box>
                  <Icon
                    display={isSidebarOpen ? "" : "none"}
                    as={isCampaignManagerOpen ? GoChevronUp : GoChevronDown}
                    color={(currentPath?.includes('/app/chatbots') ||
                      currentPath?.includes('/app/voice-campaign') ||
                      currentPath?.includes('/app/smtp-settings') ||
                      currentPath?.includes('/app/email-warmup') ||
                      currentPath?.includes('/app/email-campaigns') ||
                      currentPath?.includes('/app/postmark-settings') ||
                      currentPath?.includes('/app/inbound-voice-calls') ||
                      currentPath?.includes('/app/email-assistant'))
                      // ||isCampaignManagerOpen
                      ? "#6366F1"
                      : "#454545"}
                  />
                </Button>
                <Collapse in={isCampaignManagerOpen} >
                  <VStack align="stretch" spacing={2} pl={3}
                    mt={2}>
                    <Box>
                      <Button
                        width="100%"
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        bg="transparent"
                        onClick={() => {
                          setEmailSection(false);
                          // setIsCampaignManagerOpen(false);
                          setIsUltimaMailOpen(false);
                          history.push('/app/chatbots');
                        }}
                        // py={1}
                        // px={2}
                        padding={"7px 14px"}
                        variant="unstyled"
                        _focus={{ outline: 'none' }}
                      >
                        <Text
                          fontSize="14px"
                          fontWeight="600 !important"
                          _hover={{ color: '#2977FF' }}
                          cursor="pointer"
                          display="flex"
                          alignItems="center"
                          gap={4}
                          color={currentPath?.includes('/app/chatbots') || currentPath?.includes('/app/edit-chatbot/') ? '#2977FF' : '#454545'}
                          className={currentPath?.includes('/app/chatbots') || currentPath?.includes('/app/edit-chatbot/') ? isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed : ''}
                        >
                          <Box
                            w="5px"
                            h="5px"
                            borderRadius="full"
                            bg={currentPath?.includes('/app/chatbots') ? '#2977FF' : '#454545'}
                            className={styles.bullet}
                          // bg="#454545"
                          />
                          ChatBot
                        </Text>

                      </Button>
                    </Box>

                    {/* VoiceBot */}
                    <Box>
                      <Button
                        width="100%"
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        bg="transparent"
                        onClick={() => {
                          setIsVoiceBotOpen(!isVoiceBotOpen);
                          setEmailSection(false);
                          setIsUltimaMailOpen(false);
                          setIsAssistantOpen(false);
                        }}
                        padding={"7px 14px"}
                        variant="unstyled"
                        _focus={{ outline: 'none' }}
                      >
                        <Text
                          fontSize="14px"
                          fontWeight="600 !important"
                          _hover={{ color: '#2977FF' }}
                          cursor="pointer"
                          display="flex"
                          alignItems="center"
                          gap={4}
                          color={isVoiceBotOpen ? '#2977FF' : '#454545'}
                        >
                          <Box
                            w="5px"
                            h="5px"
                            borderRadius="full"
                            bg="#454545"
                            className={styles.bullet}
                          />
                          VoiceBot
                        </Text>
                        <Icon
                          as={isVoiceBotOpen ? GoChevronUp : GoChevronDown}
                          color={isVoiceBotOpen ? "#2977FF" : "#454545"}
                        />
                      </Button>

                      <Collapse in={isVoiceBotOpen}>
                        <VStack align="stretch" spacing={2} mt={1}
                          padding={"0px 14px"}
                        >
                          {menuItemsvoiceAssistant.map((item: any) => {
                            const active = item.isActive
                              ? item.isActive(currentPath)
                              : currentPath === item.path;

                            return (
                              <Link
                                to={item.path}
                                key={item.name}
                                style={{ pointerEvents: !item.disabled ? "none" : "auto" }}
                              >
                                <Text
                                  className={getActiveClass(item)}
                                  fontSize="14px"
                                  fontWeight="600 !important"
                                  px={'0.75rem !important'}
                                  marginY={"2px"}
                                  cursor={!item.disabled ? "not-allowed" : "pointer"}
                                  opacity={!item.disabled ? 0.5 : 1}
                                  display="flex"
                                  alignItems="center"
                                  gap={4}
                                  color={active ? "#2977FF" : "#454545"}
                                >
                                  <Box
                                    w="5px"
                                    h="5px"
                                    borderRadius="full"
                                    bg={active ? "#2977FF" : "#454545"}
                                    className={styles.bullet}
                                  />
                                  {item.name}
                                </Text>
                              </Link>
                            );
                          })}
                        </VStack>
                      </Collapse>
                    </Box>
                    {/* email */}
                    <Box>
                      <Button
                        width="100%"
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        bg="transparent"
                        onClick={() => {
                          setEmailSection(!isEmailSection);
                          setIsVoiceBotOpen(false);
                          setIsUltimaMailOpen(false);
                          setIsAssistantOpen(false);
                        }}
                        padding={"7px 14px 7px 16px"}
                        variant="unstyled"
                        _focus={{ outline: 'none' }}
                      >
                        <Text
                          fontSize="14px"
                          fontWeight="600 !important"
                          _hover={{ color: '#2977FF' }}
                          cursor="pointer"
                          display="flex"
                          alignItems="center"
                          gap={4}
                          color={isEmailSection ? '#2977FF' : '#454545'}
                        >
                          <Box
                            w="5px"
                            h="5px"
                            borderRadius="full"
                            bg="#454545"
                            className={styles.bullet}
                          />
                          Email
                        </Text>
                        <Icon
                          as={isEmailSection ? GoChevronUp : GoChevronDown}
                          color={isEmailSection ? "#2977FF" : "#454545"}
                        />
                      </Button>

                      <Collapse in={isEmailSection}>
                        <VStack align="stretch" spacing={2} mt={1}
                          padding={"0px 14px"}
                        >
                          {/* email warm up  	{ name: 'SMTP Settings', path: '/app/smtp-settings/details' },*/}
                          <Box mt={0}>
                            <Button
                              width="100%"
                              height="20px"
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                              bg="transparent"
                              mt={'0.3rem !important'}
                              onClick={() => {
                                setIsUltimaMailOpen(false);
                                setIsAssistantOpen(false);
                                history.push('/app/smtp-settings/details');
                              }}
                              py={1}
                              px={2}
                              variant="unstyled"
                              _focus={{ outline: 'none' }}
                            >
                              <Text
                                fontSize="14px"
                                fontWeight="600 !important"
                                className={isSmtpSettingsActive() ? (isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed) : ''}
                                _hover={{ color: '#2977FF' }}
                                cursor="pointer"
                                display="flex"
                                px={'0.75rem !important'}
                                pl={3}
                                alignItems="center"
                                gap={4}
                                color={currentPath.includes("/app/smtp-settings") ? '#2977FF' : '#454545'}

                              >
                                <Box
                                  w="5px"
                                  h="5px"
                                  borderRadius="full"
                                  bg={currentPath?.includes("/app/smtp-settings") ? '#2977FF' : "#454545"}
                                  className={styles.bullet}
                                />
                                Email Connections
                              </Text>

                            </Button>
                          </Box>
                          {/* email warm up */}
                          <Box mt={0}>
                            <Button
                              width="100%"
                              height="20px"
                              display="flex"
                              justifyContent="space-between"
                              mt={'0.3rem !important'}
                              alignItems="center"
                              bg="transparent"
                              onClick={() => {
                                setIsUltimaMailOpen(false);
                                setIsAssistantOpen(false);
                                history.push('/app/email-warmup');
                              }}
                              py={1}
                              px={2}
                              variant="unstyled"
                              _focus={{ outline: 'none' }}
                            >
                              <Text
                                fontSize="14px"
                                fontWeight="600 !important"
                                className={getActiveClassForEmail("/app/email-warmup")}
                                _hover={{ color: '#2977FF' }}
                                cursor="pointer"
                                px={'0.75rem !important'}
                                display="flex"
                                alignItems="center"
                                gap={4}
                                color={currentPath.includes("/app/email-warmup") ? '#2977FF' : '#454545'}
                              >
                                <Box
                                  w="5px"
                                  h="5px"
                                  borderRadius="full"
                                  bg={currentPath.includes("/app/email-warmup") ? '#2977FF' : "#454545"}
                                  className={styles.bullet}
                                />
                                Email Warm-up

                              </Text>

                            </Button>
                          </Box>
                          {/* UltimaMail */}
                          <Box mt={0}>
                            <Button
                              width="100%"
                              height="20px"
                              display="flex"
                              mt={'0.3rem !important'}
                              justifyContent="space-between"
                              alignItems="center"
                              bg="transparent"
                              onClick={() => {
                                setIsUltimaMailOpen(!isUltimaMailOpen);
                                setIsAssistantOpen(false);
                                setIsVoiceBotOpen(false);
                              }}
                              py={1}
                              px={2}
                              variant="unstyled"
                              _focus={{ outline: 'none' }}
                            >
                              <Text
                                fontSize="14px"
                                fontWeight="600 !important"
                                _hover={{ color: '#2977FF' }}
                                cursor="pointer"
                                display="flex"
                                alignItems="center"
                                ps={'0.75rem'}
                                gap={4}
                                color={isUltimaMailOpen ? '#2977FF' : '#454545'}
                              >
                                <Box
                                  w="5px"
                                  h="5px"
                                  borderRadius="full"
                                  bg="#454545"
                                  className={styles.bullet}
                                />
                                {/* Ultimamail */}
                                Email Outreach
                              </Text>
                              <Icon
                                as={
                                  isUltimaMailOpen ? GoChevronUp : GoChevronDown
                                }
                                color={isUltimaMailOpen ? "#2977FF" : "#454545"}
                              />
                            </Button>

                            <Collapse in={isUltimaMailOpen}>
                              <VStack align="stretch" spacing={2} mt={1}>
                                {ultimamailItems.map((item) => {
                                  const active = isActiveEmailPath(item.path);

                                  return (
                                    <Link to={item.path} key={item.name}>
                                      <Text
                                        className={getActiveClassForEmail(item.path)}
                                        fontSize="14px"
                                        fontWeight="600 !important"
                                        cursor="pointer"
                                        display="flex"
                                        alignItems="center"
                                        gap={4}
                                        ml={'0.75rem'}
                                        ps={'0.75rem !important'}
                                        mt={'0.3rem !important'}
                                        color={active ? "#2977FF" : "#454545"}
                                      >
                                        <Box
                                          w="5px"
                                          h="5px"
                                          borderRadius="full"
                                          bg={active ? "#2977FF" : "#454545"}
                                          className={styles.bullet}
                                        />
                                        {item.name}
                                      </Text>
                                    </Link>
                                  );
                                })}
                              </VStack>
                            </Collapse>
                          </Box>

                          {/* The Assistant */}
                          <Box mt={"11px!important"}>
                            <Button
                              width="100%"
                              height="20px"
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                              bg="transparent"
                              onClick={() => {
                                setIsAssistantOpen(!isAssistantOpen);
                                setIsUltimaMailOpen(false);
                                setIsVoiceBotOpen(false);
                              }}
                              py={1}
                              px={2}
                              variant="unstyled"
                              _focus={{ outline: 'none' }}
                            >
                              <Text
                                fontSize="14px"
                                margin={0}
                                fontWeight="600 !important"
                                _hover={{ color: '#2977FF' }}
                                cursor="pointer"
                                display="flex"
                                alignItems="center"
                                gap={4}
                                ps={'0.75rem'}
                                mt={'0.3rem !important'}
                                color={isAssistantOpen ? '#2977FF' : '#454545'}
                              >
                                <Box
                                  w="5px"
                                  h="5px"
                                  borderRadius="full"
                                  bg="#454545"
                                  className={styles.bullet}
                                />
                                {/* The Assistant */}
                                Email Assistant
                              </Text>
                              <Icon
                                as={isAssistantOpen ? GoChevronUp : GoChevronDown}
                                color={isAssistantOpen ? "#2977FF" : "#454545"}
                              />
                            </Button>

                            <Collapse in={isAssistantOpen}>
                              <VStack align="stretch" spacing={2} mt={1}>
                                {menuItemsAssistant.map((item) => {
                                  const active = item.path == '/app/email/email-conversation'
                                    ? !currentPath.includes('/app/email-assistant/dashboard')
                                    && !currentPath.includes('/app/email-assistant/notifications')
                                    && !currentPath.includes('/app/email-assistant/settings')
                                    : isActiveAssistantPath(item.path);
                                  return (
                                    <Link to={item.path} key={item.name}>
                                      <Text
                                        className={active ? (isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed) : ''}
                                        fontSize="14px"
                                        marginY={"2px"}
                                        fontWeight="600 !important"
                                        cursor="pointer"
                                        display="flex"
                                        alignItems="center"
                                        gap={4}
                                        ml={'0.75rem'}
                                        px={'0.75rem !important'}
                                        color={active ? "#2977FF" : "#454545"}
                                      >
                                        <Box
                                          w="5px"
                                          h="5px"
                                          borderRadius="full"
                                          bg={active ? "#2977FF" : "#454545"}
                                          className={styles.bullet}
                                        />
                                        {item.name}
                                      </Text>
                                    </Link>
                                  );
                                })}
                              </VStack>
                            </Collapse>
                          </Box>

                          {/*	Email Conversation */}
                          <Box mt={0}>
                            <Button
                              mt={0}
                              width="100%"
                              height="35px"
                              display="flex"
                              justifyContent="space-between"
                              // mt={'0.3rem !important'}
                              alignItems="center"
                              bg="transparent"
                              onClick={() => {
                                setIsUltimaMailOpen(false);
                                setIsAssistantOpen(false);
                                history.push('/app/email/email-conversation');
                              }}
                              py={1}
                              px={2}
                              variant="unstyled"
                              _focus={{ outline: 'none' }}
                            >
                              <Text
                                fontSize="14px"
                                fontWeight="600 !important"
                                className={currentPath.includes("/app/email/email-conversation") || currentPath.includes("/app/email-conversation") ? styles.activeNav : ""}
                                // className={getActiveClassForEmail("/app/email/email-conversation")}
                                _hover={{ color: '#2977FF' }}
                                cursor="pointer"
                                px={'0.75rem !important'}
                                display="flex"
                                alignItems="center"
                                gap={4}
                                color={currentPath.includes("/app/email/email-conversation") || currentPath.includes("/app/email-conversation") ? '#2977FF' : '#454545'}
                              >
                                <Box
                                  w="5px"
                                  h="5px"
                                  borderRadius="full"
                                  bg={currentPath.includes("/app/email/email-conversation") || currentPath.includes("/app/email-conversation") ? '#2977FF' : "#454545"}
                                  className={styles.bullet}
                                />
                                Email Conversation

                              </Text>

                            </Button>
                          </Box>

                        </VStack>
                      </Collapse>
                    </Box>
                  </VStack>
                </Collapse>
              </Box>
            </Box>
            {/* Zapier Menus */}
            <Box
              minW={isSidebarOpen ? "200px" : "0px"}
              marginLeft={isSidebarOpen ? "unset" : "-2px"}
              my="0px"
              marginTop={"5px!important"}
            >
              <Button
                width="100%"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                onClick={() => {
                  setIsSidebarOpen(true)
                  setIsZapierOpen(!isZapierOpen);
                  // setIsCampaignManagerOpen(false);
                }}
                variant="unstyled"
                disabled={(isProjectCount < 1) || isUserDeleted}
                _focus={{ outline: 'none' }}
                padding={"7px 16px"}
                minW={isSidebarOpen ? "100%" : "33px"}
                maxH={isSidebarOpen ? "100%" : "35px"}
                borderRadius={isSidebarOpen ? "20px!important" : "6px!important"}
                style={{
                  padding: isSidebarOpen ? "8px 16px" : "5px",
                  textDecoration: "none",
                  backgroundColor: (currentPath === '/app/zapier/create-webhook' ||
                    currentPath === '/app/zapier/connect-webhook')
                    ? '#FFEDE5' : 'transparent',
                  color: (currentPath === '/app/zapier/create-webhook' ||
                    currentPath === '/app/zapier/connect-webhook')
                    ? '#FF4A00' : '#454545',
                }}
                className={
                  // Check if any Zapier sub-item is active
                  (currentPath === '/app/zapier/create-webhook' ||
                    currentPath === '/app/zapier/connect-webhook')
                    ? (isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed)
                    : ''
                }
              >
                <Box display="flex" alignItems="center" gap={2}
                  _hover={{ color: "#FF4A00" }}
                >
                  <Image src="/icons/ic-zapier.svg" alt="Zapier" width="24px" height="24px" />
                  <Text as="span" fontSize="14px"
                    fontWeight="600 !important"
                    color={
                      // isZapierOpen ||
                      currentPath === '/app/zapier/create-webhook' ||
                        currentPath === '/app/zapier/connect-webhook'
                        ? "#FF4A00"
                        : "#454545"
                    }
                    display={isSidebarOpen ? "" : "none"}>
                    Zapier
                  </Text>
                </Box>
                {/* <Image src="/icons/ic-zapier.svg" alt="Zapier" width="24px" height="24px" /> */}

                <Icon
                  display={isSidebarOpen ? "" : "none"}
                  as={isZapierOpen ? GoChevronUp : GoChevronDown}
                  color={
                    // isZapierOpen ||
                    currentPath === '/app/zapier/create-webhook' ||
                      currentPath === '/app/zapier/connect-webhook'
                      ? "#2977FF"
                      : "#454545"
                  }
                />
              </Button>

              <Collapse in={isZapierOpen}>
                <VStack align="stretch" spacing={2} mt={2}
                  padding={"7px 0px 7px 15px"}
                >
                  {zapierItems.map((item: any) => {
                    const active = isActiveAssistantPath(item.path);

                    return (
                      <Link to={item.path} key={item.name}>
                        <Text
                          // className={getActiveClassForAssistant(item.path)}
                          className={active ? (isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed) : ''}
                          fontSize="14px"
                          fontWeight="600 !important"
                          cursor="pointer"
                          display="flex"
                          alignItems="center"
                          marginY={"2px"}
                          gap={4}
                          ps={'0.75rem !important'}
                          pe={'0px !important'}
                          color={active ? "#2977FF" : "#454545"}
                        >
                          <Box
                            w="5px"
                            h="5px"
                            borderRadius="full"
                            bg={active ? "#2977FF" : "#454545"}
                            className={styles.bullet}
                          />
                          {item.name}
                        </Text>
                      </Link>
                    );
                  })}
                </VStack>
              </Collapse>
            </Box>


            {userProfile?.role === 'admin' ? (
              <ListItem display="flex" mt={"0px"} alignItems="center" fontSize="sm" onClick={() => {
                setIsSidebarOpen(true)
              }}>
                <NavLink
                  activeClassName={isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed} to="/app/users"
                  // style={{ color: '#454545' }}
                  style={{
                    padding: isSidebarOpen ? "8px 18px" : "5px",
                    textDecoration: "none",
                    backgroundColor: (currentPath?.includes("/app/users"))
                      ? '#E7F8F6' : 'transparent',
                    color: (currentPath?.includes("/app/users"))
                      ? '#14B8A6' : '#454545',
                  }}
                >
                  <Flex alignItems="center" gap={3} _hover={{ color: "#14B8A6" }}>
                    <Image src="/icons/ic-people_fill.svg" alt="Zapier" width="24px" height="24px" />
                    <Text as="span" fontSize="14px"
                      fontWeight="600 !important" display={isSidebarOpen ? "" : "none"} style={{ transition: "0.3s" }}>
                      Platform Users
                    </Text>
                  </Flex>
                </NavLink>
              </ListItem>
            ) : null}

            {userProfile?.role === 'admin' ? (
              <ListItem display="flex" alignItems="center" fontSize="sm" onClick={() => {
                setIsSidebarOpen(true)
              }}>
                <NavLink
                  activeClassName={isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed}
                  style={{
                    padding: isSidebarOpen ? "8px 18px" : "5px",
                    textDecoration: "none",
                    backgroundColor: (currentPath?.includes("/app/email-templates"))
                      ? '#FDECF5' : 'transparent',
                    color: (currentPath?.includes("/app/email-templates"))
                      ? '#EC4899' : '#454545',
                  }}
                  to="/app/email-templates"

                >
                  <Flex alignItems="center" _hover={{ color: "#EC4899" }}>
                    <span style={{ marginRight: isSidebarOpen ? "10px" : "0px", background: "none" }}>
                      <Image src="/icons/envelope-open-fill.svg" alt="Zapier" width="24px" height="24px" />
                    </span>
                    <Text as="span" fontSize="14px"
                      fontWeight="600 !important" display={isSidebarOpen ? "" : "none"} style={{ transition: "0.3s" }}>
                      Email Templates
                    </Text>
                  </Flex>
                </NavLink>
              </ListItem>
            ) : null}

            {userProfile?.role === 'admin' ? (
              <ListItem display="flex" alignItems="center" fontSize="sm"
                onClick={() => {
                  setIsSidebarOpen(true)
                }}
              >
                <NavLink
                  activeClassName={isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed}
                  to="/app/vakmangids-chatbot/6740784777f34c18ad3ad90e/?tab=scrape-website-data"
                  style={{
                    padding: isSidebarOpen ? "8px 18px" : "5px",
                    textDecoration: "none",
                    backgroundColor: (currentPath?.includes("/app/vakmangids-chatbot/6740784777f34c18ad3ad90e/"))
                      ? '#EAF0F8' : 'transparent',
                    color: (currentPath?.includes("/app/vakmangids-chatbot/6740784777f34c18ad3ad90e/"))
                      ? '#336BBA' : '#454545',
                  }}
                // to="/app/edit-bot/6740784777f34c18ad3ad90e/"
                >
                  <Flex alignItems="center" _hover={{ color: "#336BBA" }}>
                    {/* <VakmangidsIcon /> */}
                    <Image src="/icons/ic-vegment.svg" alt="Zapier" width="24px" height="24px" />
                    {
                      isSidebarOpen &&
                      <span style={{ marginLeft: '8px', fontWeight: 600 }}>Vakmangids ChatBots</span>
                    }
                  </Flex>
                </NavLink>
              </ListItem>
            ) : null}
            {userProfile?.role === 'admin' ? (
              <ListItem display="flex" alignItems="center" fontSize="sm"
                onClick={() => {
                  setIsSidebarOpen(true)
                }}>
                <NavLink
                  activeClassName={isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed}
                  style={{
                    padding: isSidebarOpen ? "8px 18px" : "5px",
                    textDecoration: "none",
                    backgroundColor: (currentPath?.includes("/app/inviteUsers"))
                      ? '#FDECEC' : 'transparent',
                    color: (currentPath?.includes("/app/inviteUsers"))
                      ? '#EF4444' : '#454545',
                  }}
                  to="/app/inviteUsers"
                >
                  <Flex alignItems="center" gap={3} _hover={{ color: "#EF4444" }}>

                    {/* <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M12.8224 7.44459C12.6 7.23074 12.3059 7.11146 12 7.11111H9.6L9.4596 7.11967C9.15589 7.15646 8.87743 7.30998 8.68112 7.54887C8.48481 7.78776 8.38547 8.09398 8.40339 8.40496C8.42132 8.71595 8.55515 9.00822 8.77756 9.22207C8.99996 9.43593 9.29414 9.55521 9.6 9.55556H12L12.1404 9.547C12.4441 9.51021 12.7226 9.35668 12.9189 9.11779C13.1152 8.87891 13.2145 8.57269 13.1966 8.2617C13.1787 7.95072 13.0448 7.65844 12.8224 7.44459Z" fill="#888888" />
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M18 1C18.9183 0.999948 19.8018 1.35729 20.4699 1.9989C21.138 2.64052 21.5401 3.51791 21.594 4.45156L21.6 4.66667V9.98333L22.3128 9.66067C23.0496 9.327 23.8992 9.844 23.9928 10.636L24 10.7778V20.5556C24.0002 21.1723 23.7715 21.7662 23.3598 22.2184C22.9481 22.6706 22.3838 22.9476 21.78 22.9939L21.6 23H2.4C1.79451 23.0002 1.21132 22.7673 0.767342 22.3479C0.323365 21.9286 0.051412 21.3539 0.00600014 20.7389L0 20.5556V10.7778C0 9.95644 0.81 9.37589 1.5564 9.61056L1.6884 9.66067L2.4 9.98333V4.66667C2.39995 3.73141 2.75079 2.83148 3.38074 2.15101C4.01069 1.47055 4.87213 1.06098 5.7888 1.00611L6 1H18ZM18 3.44444H6C5.68174 3.44444 5.37652 3.57321 5.15147 3.80243C4.92643 4.03164 4.8 4.34251 4.8 4.66667V11.0699L12 14.3296L19.2 11.0699V4.66667C19.2 4.34251 19.0736 4.03164 18.8485 3.80243C18.6235 3.57321 18.3183 3.44444 18 3.44444Z" fill="#888888" />
                    </svg> */}
                    <Image src="/icons/ic-invite-2.svg" alt="Zapier" width="24px" height="24px" />
                    <Text as="span" fontSize="14px"
                      fontWeight="600 !important" display={isSidebarOpen ? "" : "none"} style={{ transition: "0.3s" }}>
                      Scraped Leads Data
                    </Text>
                  </Flex>
                </NavLink>
              </ListItem>
            ) : null}

            {isOpenAIUsageEmail(userProfile) ? (
              <ListItem
                display="flex"
                alignItems="center"
                fontSize="sm"
                onClick={() => setIsSidebarOpen(true)}
              >
                <NavLink
                  to="/app/open-ai-usage"
                  activeClassName={
                    isSidebarOpen
                      ? styles.activeNav
                      : styles.activeNavCollapsed
                  }
                  style={{
                    padding: isSidebarOpen ? "8px 18px" : "5px",
                    textDecoration: "none",
                    backgroundColor: currentPath.includes("/app/open-ai-usage")
                      ? "#EEF4FF"
                      : "transparent",
                    color: currentPath.includes("/app/open-ai-usage")
                      ? "#2563EB"
                      : "#454545",
                  }}
                >
                  <Flex alignItems="center" gap={3}>
                    <Image
                      src="/icons/ic-openai.svg"
                      alt="Open AI Usage"
                      width="24px"
                      height="24px"
                    />

                    <Text
                      as="span"
                      fontSize="14px"
                      fontWeight="600 !important"
                      display={isSidebarOpen ? "" : "none"}
                    >
                      Open AI Usage
                    </Text>
                  </Flex>
                </NavLink>
              </ListItem>
            ) : null}


            {/* {userProfile?.role === 'admin' ? (
                    <ListItem display="flex" alignItems="center" fontSize="sm"
                      onClick={() => {
                        setIsSidebarOpen(true)
                      }}
                    >
                      <NavLink activeClassName={isSidebarOpen ? styles.activeNav : styles.activeNavCollapsed} to="/app/settings" style={{ color: '#454545' }}>
                        <Flex alignItems="center" gap={3}>
   
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clip-path="url(#clip0_10525_34984)">
                              <path fill-rule="evenodd" clip-rule="evenodd" d="M14.1075 1.575C13.488 -0.525 10.512 -0.525 9.8925 1.575L9.7425 2.085C9.64994 2.39939 9.48818 2.68908 9.26909 2.93282C9.05 3.17656 8.77913 3.36817 8.47634 3.4936C8.17356 3.61902 7.84654 3.67509 7.51927 3.65768C7.192 3.64028 6.87277 3.54984 6.585 3.393L6.12 3.138C4.1955 2.091 2.091 4.1955 3.1395 6.1185L3.393 6.585C4.062 7.815 3.4275 9.3465 2.085 9.7425L1.575 9.8925C-0.525 10.512 -0.525 13.488 1.575 14.1075L2.085 14.2575C2.39939 14.3501 2.68908 14.5118 2.93282 14.7309C3.17656 14.95 3.36817 15.2209 3.4936 15.5237C3.61902 15.8264 3.67509 16.1535 3.65768 16.4807C3.64028 16.808 3.54984 17.1272 3.393 17.415L3.138 17.88C2.091 19.8045 4.1955 21.909 6.1185 20.8605L6.585 20.607C6.87277 20.4502 7.192 20.3597 7.51927 20.3423C7.84654 20.3249 8.17356 20.381 8.47634 20.5064C8.77913 20.6318 9.05 20.8234 9.26909 21.0672C9.48818 21.3109 9.64994 21.6006 9.7425 21.915L9.8925 22.425C10.512 24.525 13.488 24.525 14.1075 22.425L14.2575 21.915C14.3501 21.6006 14.5118 21.3109 14.7309 21.0672C14.95 20.8234 15.2209 20.6318 15.5237 20.5064C15.8264 20.381 16.1535 20.3249 16.4807 20.3423C16.808 20.3597 17.1272 20.4502 17.415 20.607L17.88 20.862C19.8045 21.909 21.909 19.8045 20.8605 17.8815L20.607 17.415C20.4502 17.1272 20.3597 16.808 20.3423 16.4807C20.3249 16.1535 20.381 15.8264 20.5064 15.5237C20.6318 15.2209 20.8234 14.95 21.0672 14.7309C21.3109 14.5118 21.6006 14.3501 21.915 14.2575L22.425 14.1075C24.525 13.488 24.525 10.512 22.425 9.8925L21.915 9.7425C21.6006 9.64994 21.3109 9.48818 21.0672 9.26909C20.8234 9.05 20.6318 8.77913 20.5064 8.47634C20.381 8.17356 20.3249 7.84654 20.3423 7.51927C20.3597 7.192 20.4502 6.87277 20.607 6.585L20.862 6.12C21.909 4.1955 19.8045 2.091 17.8815 3.1395L17.415 3.393C17.1272 3.54984 16.808 3.64028 16.4807 3.65768C16.1535 3.67509 15.8264 3.61902 15.5237 3.4936C15.2209 3.36817 14.95 3.17656 14.7309 2.93282C14.5118 2.68908 14.3501 2.39939 14.2575 2.085L14.1075 1.575ZM12 16.395C13.1656 16.395 14.2835 15.932 15.1077 15.1077C15.932 14.2835 16.395 13.1656 16.395 12C16.395 10.8344 15.932 9.71649 15.1077 8.89227C14.2835 8.06804 13.1656 7.605 12 7.605C10.8348 7.605 9.71727 8.06789 8.89333 8.89183C8.06938 9.71577 7.6065 10.8333 7.6065 11.9985C7.6065 13.1637 8.06938 14.2812 8.89333 15.1052C9.71727 15.9291 10.8348 16.392 12 16.392V16.395Z" fill="#888888" />
                            </g>
                            <defs>
                              <clipPath id="clip0_10525_34984">
                                <rect width="24" height="24" fill="white" />
                              </clipPath>
                            </defs>
                          </svg>
   
                          <Text as="span" fontSize="14px"
                            fontWeight="600 !important" display={isSidebarOpen ? "" : "none"} style={{ transition: "0.3s" }}>
                            Settings
                          </Text>
                        </Flex>
                      </NavLink>
                    </ListItem>
                  ) : null} */}


          </>
        </List>
      </Flex >
    </>
  );
};

export default AppSidebar;