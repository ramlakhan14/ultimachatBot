import React from "react";
import {
  Box,
  Flex,
  Heading,
  VStack,
  HStack,
  Text,
  Image,
  Spinner,
  Button,
  Select,
  Alert,
  AlertDescription,
  color,
  Td,
  Tr,
  Tbody,
  Table,
  TableContainer,
  Th,
  Thead,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  useToast,
  Icon,
  Wrap,
  WrapItem,
  List,
  ListItem,
} from '@chakra-ui/react';
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Bar,
  LabelList,
  BarChart,
} from 'recharts';
import styles from './Globaldashboard.module.scss';
import SvgExport2 from "../EmailAssistantAdmin/AllMail/SvgExport2";
import { getDashboardData, fetchConfigKey, fetchAllPhoneNumber } from "../../services/VoiceBot";
import { useDispatch, useSelector } from "react-redux";
import GdprTimeline from "../Users/GdprTimeline";
import { MdRestore } from "react-icons/md";
import { callApi } from "../../services/callApi";
import { getProfileRequest } from "../../redux/actions/globalActions";
import { FiMail, FiMessageCircle, FiMessageSquare, FiMic } from "react-icons/fi";
import { useHistory } from "react-router-dom";
import RecentLeadsMessage from "./RecentLeadsMessage";
import SummaryModal from "../AllLeads/SummaryModal";
import { fetchKnowledgebases } from "../../services/knowledgebaseService";
import { GoInfo } from "react-icons/go";
import { baseURL } from "../../config";

interface ProjectOption {
  _id: string;
  projectName: string;
  name: string;
}

const GlobalDashboard = () => {
  const currentYear = new Date().getFullYear();
  const [isFetching, setIsFetching] = React.useState(false);
  const [dashboardData, setDashboardData] = React.useState<any>({});
  const [showSummaryModal, setShowSummaryModal] = React.useState<any>({});

  const [selectedValue, setSelectedValue] = React.useState("all");
  const [selectedMonth, setSelectedMonth] = React.useState("");
  const [selectedYear, setSelectedYear] = React.useState<any>("");
  const currentMonth = new Date().getMonth() + 1;
  const [availableMonths, setAvailableMonths] = React.useState<number[]>([]);
  const toast = useToast();
  const [projects, setProjects] = React.useState<ProjectOption[]>([]);
  const [projectfilter, setProjectFilter] = React.useState<any>("");

  const [titleOpen, setTitleOpen] = React.useState<boolean>(false);
  const history = useHistory()
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const dispatch = useDispatch()
  React.useEffect(() => {
    if (!userProfile.name) {
      dispatch(getProfileRequest())
    }
  }, [])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "#fff",
            border: "1px solid #ccc",
            padding: "8px 12px",
          }}
        >
          {label} : {payload[0].value}
        </div>
      );
    }

    return null;
  };


  const renderCustomXAxisTick = ({ x, y, payload }: any) => {
    const lines = payload.value.split(" ");

    return (
      <g transform={`translate(${x},${y + 25})`}>
        {lines.map((line: any, index: any) => (
          <text
            key={index}
            x={0}
            y={index * 18}
            textAnchor="middle"
            fill="#7A7A7A"
            fontSize={14}
          >
            {line}
          </text>
        ))}
      </g>
    );
  };

  const formatDateTime = (dateStr: string, timeZone: string) => {
    const date = new Date(dateStr);

    const formattedDate = date.toLocaleDateString('en-GB', {
      timeZone,
    });

    const formattedTime = date
      .toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone,
      })
      .toUpperCase();

    return `${formattedDate}, ${formattedTime}`;
  };
  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(event.target.value, 10);
    setSelectedYear(value);
  };
  const userProfile = useSelector((state: any) => state.user?.profile) || {}

  const handleVoiceBotNavigation = async () => {
    try {
      const configResponse: any = await fetchConfigKey();
      const postmarkId = configResponse?.data?.data?._id;

      if (!postmarkId) {
        history.push("/app/voice-campaign/create?subTab=step-up");
        return;
      }

      const phoneResponse: any = await fetchAllPhoneNumber();
      const phoneNumbers = phoneResponse?.data?.data || [];

      if (!phoneNumbers.length) {
        // history.push(`/app/voice-campaign/number-history-details/${postmarkId}`);
        history.push({
          pathname: `/app/voice-campaign/number-history-details/${postmarkId}`,
          state: {
            openAddPhonePopup: true,
          },
        });
        return;
      }

      history.push("/app/voice-campaign/create?subTab=step-up");
    } catch (error) {
      history.push("/app/voice-campaign/create?subTab=step-up");
    }
  };

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedMonth(value);
  };
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedValue(event.target.value);
  };
  const fetchData = async (selectedValue: string, selectedMonth: string, selectedYear: number, projectfilter: string) => {
    try {
      setIsFetching(true);
      const response: any = await getDashboardData(selectedValue, selectedMonth, selectedYear, projectfilter);
      // console.log("response?.data?.data", response?.data?.data);
      setDashboardData(response?.data?.data);
    } catch (error: any) {
      // Error handling
    } finally {
      setIsFetching(false);
    }
  };

  React.useEffect(() => {
    fetchData(selectedValue, selectedMonth, selectedYear, projectfilter);
  }, [selectedValue, selectedMonth, selectedYear, projectfilter]);

  const dataBar = [
    {
      name: "ChatBot",
      value: dashboardData?.leadGenerated?.chatBot || 0,
      gradientId: "gradChatBot",
      colorStart: "#007AFF",
      colorEnd: "#007AFF",
      stroke: "#007AFF",
    },
    {
      name: "Email Assistant",
      value: dashboardData?.leadGenerated?.emailAssistant || 0,
      gradientId: "gradEmailAssistant",
      colorStart: "#6200EE",
      colorEnd: "#6200EE",
      stroke: "#6200EE",
    },
    {
      name: "Email Outreach",
      value: dashboardData?.leadGenerated?.emailOutreach || 0,
      gradientId: "gradEmailOutreach",
      colorStart: "#D946EF", // You can adjust if Figma has another shade
      colorEnd: "#D946EF",
      stroke: "#D946EF",
    },
    {
      name: "VoiceBot",
      value: dashboardData?.leadGenerated?.voiceBot || 0,
      gradientId: "gradVoiceBot",
      colorStart: "#FF9500",
      colorEnd: "#FF9500",
      stroke: "#FF9500",
    },
  ];

  const CustomLegend = () => {
    return (
      <Flex justifyContent="center" mt={4} gap={6}>

        <Flex alignItems="center">
          <Box bg="#007AFF" w="14.50px" h="14.50px" mr={2}></Box>
          <Text>ChatBot</Text>
        </Flex>
        {/* <Flex alignItems="center">
          <Box bg="#6200EE" w="14.50px" h="14.50px" mr={2}></Box>
          <Text>EmailBot</Text>
        </Flex> */}
        <Flex alignItems="center">
          <Box bg="#6200EE" w="14.50px" h="14.50px" mr={2}></Box>
          <Text>Email Assistant</Text>
        </Flex>
        <Flex alignItems="center">
          <Box bg="#CB30E0" w="14.50px" h="14.50px" mr={2}></Box>
          <Text>Email Outreach</Text>
        </Flex>
        <Flex alignItems="center">
          <Box bg="#FF9500" w="14.50px" h="14.50px" mr={2}></Box>
          <Text>VoiceBot</Text>
        </Flex>
        {/* <Flex alignItems="center">
          <Box bg="#FF4A00" w="14.50px" h="14.50px" mr={2}></Box>
          <Text>ZapierCRM</Text>
        </Flex> */}
      </Flex>
    );
  };

  const CustomBar = (props: any) => {
    const { x, y, width, height, fill, payload } = props;

    if (payload.value <= 0 || height <= 1) {
      return null;
    }

    return (
      <g>
        {/* Bar */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={8}
          ry={8}
          fill={fill}
        />

        {/* Top + Left + Right Border */}
        <path
          d={`
          M ${x} ${y + height}
          L ${x} ${y + 8}
          Q ${x} ${y} ${x + 8} ${y}
          L ${x + width - 8} ${y}
          Q ${x + width} ${y} ${x + width} ${y + 8}
          L ${x + width} ${y + height}
        `}
          fill="none"
          stroke={payload.colorStart}
          strokeWidth={1.5}
        />
      </g>
    );
  };



  const instruction = `Total number of emails sent by this mailbox.`


  // Update available months whenever the selected year changes
  React.useEffect(() => {
    let monthLimit = 12;

    // If current year is selected, only show months up to current month
    if (selectedYear === currentYear) {
      monthLimit = currentMonth;
    }

    setAvailableMonths(Array.from({ length: monthLimit }, (_, i) => i + 1));

    // Reset month selection if it exceeds the available months for the selected year
    if (parseInt(selectedMonth) > monthLimit) {
      setSelectedMonth("");
    }
  }, [selectedYear, currentYear, currentMonth, selectedMonth]);

  // Generate dynamic year range - previous 10 years from current year
  const startYear = currentYear - 10;
  const years = Array.from(
    { length: 11 }, // 10 previous years plus current year = 11 total
    (_, index) => startYear + index
  );
  // Month names array
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];


  const recoverAccount = async () => {
    try {
      setIsSubmitting(true)
      const response = await callApi("/user/recoveraccount", "get", "")
      // console.log(response);
      toast({
        title: `${response?.message}`,
        status: "success",
        isClosable: true,
      })
      dispatch(getProfileRequest())
      setIsSubmitting(false)

    } catch (error: any) {
      setIsSubmitting(false)
      // console.log(error);
      toast({
        title: `${error?.response?.data?.message}` || error.message,
        status: "success",
        isClosable: true,
      })
    }
  }

  // Fetch projects from API
  const fetchProjects = async () => {
    try {
      const response = await fetchKnowledgebases(1, 10, true, "allprojectX", false); // Replace with your API endpoint
      setProjects(response?.data?.data); // Assuming `response` is an array of project objects
    } catch (error) {
      // console.error("Error fetching projects:", error);
    }
  };
  React.useEffect(() => {
    fetchProjects();
  }, [])



  return (
    <Box
      w="100%"
      maxW="100%"
      p="6"
      shadow="sm"
      h="100%"
      position="relative"
      overflow="auto"
      overflowX="hidden"
    >

      {
        userProfile?.gdpr?.isDeleted ?
          <Box width={"100%"}>
            <Box mb="20px">
              <Flex gap="20px" alignItems={"center"} justifyContent={"space-between"}>
                <Heading fontSize={"22px"} fontWeight={"600"}>
                  Account Deletion Overview
                </Heading>
                {/* <Tooltip label="Recover Acount"> */}
                <Button
                  onClick={() => {
                    recoverAccount()
                  }}
                  disabled={!userProfile?.gdpr?.isDeleted}
                  isLoading={isSubmitting}
                  colorScheme="green" leftIcon={<MdRestore />}>
                  Recover
                </Button>
                {/* </Tooltip> */}
              </Flex>
            </Box>
            <GdprTimeline gdpr={userProfile?.gdpr} />
          </Box> :
          <>
            {isFetching ? (

              <Box
                display={"flex"}
                justifyContent={"center"}
                alignItems={"center"}
                height={"100%"}
                className={styles.loadingCont}
                textAlign={"center"}>
                <Spinner
                  thickness="4px"
                  speed="0.65s"
                  emptyColor="gray.200"
                  size="xl"
                />
              </Box>
            ) :
              <VStack minW={"100%"} w="600px" spacing="5" sx={{
                userSelect: "none",        // ✅ disables text selection
                WebkitUserSelect: "none",  // ✅ Safari support
                MozUserSelect: "none",     // ✅ Firefox
                msUserSelect: "none",      // ✅ IE/Edge legacy
              }}>
                <Flex shrink={0} w="100%" justifyContent="space-between">
                  <Flex width="100%" justifyContent="space-between" align={"center"}>
                    <Box>
                      <Heading fontSize="30px" lineHeight={'36px'} color="#1A202C">
                        Dashboard
                      </Heading>
                    </Box>
                    <Box
                      display="flex"
                      flexDirection="row"
                      justifyContent="space-between"
                      gap={2}
                      alignItems="center"
                      flexWrap={'nowrap'}
                    >
                      <Select
                        w="130px"
                        h="40px"
                        borderRadius="5px"
                        bg="#fff"
                        color="#6C757D"
                        borderColor="#E2E8F0"
                        defaultValue={selectedValue}
                        onChange={handleChange}
                      >
                        <option value="all">All</option>
                        <option value="chatBot">ChatBot</option>
                        {/* <option value="mailBot">EmailBot</option> */}
                        <option value="emailAssistant">Email Assistant</option>
                        <option value="emailOutreach">Email Outreach</option>
                        <option value="voiceBot">VoiceBot</option>
                        {/* <option value="zapierCrm">Zapier CRM</option> */}
                      </Select>
                      <Select
                        w="160px"
                        h="40px"
                        borderRadius="5px"
                        bg="#fff"
                        color="#6C757D"
                        borderColor="#E2E8F0"
                        defaultValue={projectfilter}
                        onChange={(e) => {
                          setProjectFilter(e.target.value);
                        }}
                      >
                        <option value="">Select Project</option>
                        {projects.map((project: { _id: string; name: string }) => (
                          <option key={project._id} title={project?.name} value={project._id}>
                            {project?.name
                              ? project.name.substring(0, 20) +
                              (project.name.length > 20 ? "..." : "")
                              : "NA"}
                          </option>
                        ))}
                      </Select>
                      <Select
                        w="120px"
                        h="40px"
                        borderRadius="5px"
                        bg="#fff"
                        color="#6C757D"
                        borderColor="#E2E8F0"
                        defaultValue={selectedMonth}
                        onChange={handleMonthChange}
                      >
                        <option value="">Month</option>
                        {availableMonths.map((month) => (
                          <option key={month} value={month}>
                            {monthNames[month - 1]}
                          </option>
                        ))}
                      </Select>
                      <Select
                        w="120px"
                        h="40px"
                        borderRadius="5px"
                        bg="#fff"
                        color="#6C757D"
                        borderColor="#E2E8F0"
                        defaultValue={selectedYear}
                        onChange={handleYearChange}
                      >

                        <option value={""}>
                          Year
                        </option>
                        {years?.reverse()?.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </Select>
                    </Box>
                  </Flex>
                </Flex>


                {isFetching && (
                  <Spinner
                    display={'flex'}
                    alignItems={'center'}
                    justifyContent={'center'}
                    margin={'auto'}
                    marginTop={'100px'}
                  />
                )}
                {!isFetching && (
                  <>

                    <Flex
                      gap={4}
                      bg="gray.50"
                      borderRadius="lg"
                      w="full"
                      flexWrap={{ base: "wrap", md: "nowrap" }}
                    >
                      {/* Step 1 */}
                      <Flex
                        flex="1"
                        bg="white"
                        border="1px solid"
                        borderColor="#E2E8F0"
                        borderRadius="8px"
                        p={"16px 30px"}
                        align="center"
                        justify="space-between"
                        minH="152px"
                      >
                        <VStack align="start"
                          spacing={"16px"}
                          height={"95%"}
                          justifyContent={"space-between"}
                        >

                          <Box>
                            <Text fontSize="16px" lineHeight={"20px"} fontWeight="600"
                              color="#1A202C"
                            >
                              (Step 1) Create a{" "}
                              <Text as="span" color="#2977ff">
                                New Project
                              </Text>
                            </Text>

                            <Text fontSize="14px" color="#6C757D" mt={1}>
                              Start by creating a new project to manage your leads.
                            </Text>
                          </Box>

                          <Button
                            colorScheme="blue"
                            fontWeight={"500"}
                            size="md"
                            onClick={() => {
                              history.push("/app/create-bot")
                            }}
                          >
                            Create Project
                          </Button>
                        </VStack>

                        <Image
                          src="/icons/createproject.svg"
                          alt="project"
                          boxSize="110px"
                          objectFit="contain"
                        />
                      </Flex>

                      {/* Step 2 */}
                      <Flex
                        flex="1.5"
                        bg="white"
                        border="1px solid"
                        borderColor="#E2E8F0"
                        borderRadius="8px"
                        p={"16px 30px"}
                        align="center"
                        justify="space-between"
                        minH="152px"
                      >
                        <VStack align="start" spacing={"16px"} width="100%">
                          <Flex align="start" gap={4} justify="space-between" width="100%">
                            <Box
                              maxW={"60%"}
                            >
                              <Text fontSize="16px" lineHeight={"20px"} fontWeight="600"
                                color="#1A202C">
                                (Step 2) Setup Email, Voice or ChatBot
                              </Text>

                              <Text fontSize="14px" color="#6C757D" mt={1}>
                                Set-up your communication channels to engage with leads.
                              </Text>
                            </Box>
                            <Image
                              src="/icons/setupicon.svg"
                              alt="communication"
                              boxSize="110px"
                              objectFit="contain"
                            />
                          </Flex>

                          <Wrap spacing="10px">
                            <WrapItem>
                              <Button
                                fontWeight={"500"}
                                onClick={() => {
                                  history.push("/app/chatbots")
                                }}
                                leftIcon={
                                  <Image
                                    src="/icons/chatbotmsgicon.svg"
                                    alt="chatbot"
                                    boxSize="16px"
                                  />
                                }
                                bg="#EAF1FF"
                                color="#2977ff"
                                fontSize="16px"
                                borderRadius="8px"
                                _hover={{
                                  bg: "#E2ECFF",
                                }}
                              >
                                ChatBot
                              </Button>
                            </WrapItem>

                            <WrapItem>
                              <Button
                                fontWeight={"500"}
                                onClick={() => {
                                  history.push("/app/smtp-settings/details")

                                }}
                                leftIcon={
                                  <Image
                                    src="/icons/emailassistant.svg"
                                    alt="emailbot"
                                    boxSize="16px"
                                  />
                                }
                                bg="#EAF1FF"
                                color="#2977ff"
                                fontSize="16px"
                                borderRadius="8px"
                                _hover={{
                                  bg: "#E2ECFF",
                                }}
                              >
                                Email Assistant
                                {/* Email Assistant */}
                              </Button>
                            </WrapItem>

                            <WrapItem>
                              <Button
                                fontWeight={"500"}
                                onClick={() => {
                                  history.push("/app/email-campaigns/create?subTab=set-up")
                                }}
                                leftIcon={
                                  <Image
                                    src="/icons/emailoutreach.svg"
                                    alt="emailoutreach"
                                    boxSize="16px"
                                  />
                                }
                                bg="#EAF1FF"
                                color="#2977ff"
                                fontSize="16px"
                                borderRadius="8px"
                                _hover={{
                                  bg: "#E2ECFF",
                                }}
                              >
                                Email Outreach
                              </Button>
                            </WrapItem>
                            <WrapItem>
                              <Button
                                fontWeight={"500"}
                                onClick={() => {
                                  handleVoiceBotNavigation();
                                }}
                                leftIcon={
                                  <Image
                                    src="/icons/voicebot.svg"
                                    alt="voicebot"
                                    boxSize="16px"
                                  />
                                }
                                bg="#EAF1FF"
                                color="#2977ff"
                                fontSize="16px"
                                borderRadius="8px"
                                _hover={{
                                  bg: "#E2ECFF",
                                }}
                              >
                                VoiceBot
                              </Button>
                            </WrapItem>
                          </Wrap>
                        </VStack>
                      </Flex>
                    </Flex>


                    <Box minW={"100%"} w="600px" mt="24px!important">
                      <HStack spacing="24px" align="normal">
                        <Box
                          className={styles.voiceDashCard}
                          pos={'relative'}
                          w="100%"
                          boxShadow={'0px 1px 4px 0px #0C0C 0D0D'}
                          border="1px solid #E2E8F0"
                          p={'12px'}
                          bg={'#fff'}
                          borderRadius="8px"
                          lineHeight={'26px'}
                        >
                          <Box pos={'relative'} zIndex={1}>
                            <Flex marginBottom={"16px"} justify="space-between" alignItems={"center"}>
                              <Text
                                fontSize={{ base: "18px", sm: "20px", md: "24px" }}
                                fontWeight="600"
                                color="#2563EB"
                                lineHeight="1"
                              >
                                {dashboardData?.totalNumberOfLeads}
                              </Text>
                              <Image
                                src="/dashboard/icon 1.svg"
                                alt="communication"
                                boxSize="40px"
                                objectFit="contain"
                              />

                            </Flex>
                            <Text fontSize="12px" color="#6C757D" lineHeight={1.5}>
                              {/* Number of Leads */}
                              Leads Contacted
                            </Text>
                          </Box>
                          <Box
                            pos={'absolute'}
                            top={0}
                            left={'20px'}
                            right={0}
                            bottom={0}
                            zIndex={1}
                          // zIndex={0}   // ✅ lower than text
                          // pointerEvents="none" // ✅ prevents blocking selection
                          >
                            <SvgExport2 />
                          </Box>
                        </Box>
                        <Box
                          className={styles.voiceDashCard}
                          pos={'relative'}
                          w="100%"
                          boxShadow={'0px 1px 4px 0px #0C0C0D0D'}
                          border="1px solid #E2E8F0"
                          p={'12px'}
                          bg={'#fff'}
                          borderRadius="8px"
                          lineHeight={'26px'}

                        >
                          <Box pos={'relative'} zIndex={1}>
                            {/* <Text fontSize="18px" lineHeight={'28px'} color="#1A202C" fontWeight={500}>
                              {dashboardData?.totalNumberOfConversations}
                            </Text> */}
                            <Flex marginBottom={"16px"} justify="space-between" alignItems={"center"}>
                              <Text
                                fontSize={{ base: "18px", sm: "20px", md: "24px" }}
                                fontWeight="600"
                                color="#8B5CF6"
                                lineHeight="1"
                              >
                                {dashboardData?.totalNumberOfConversations}
                              </Text>
                              <Image
                                src="/dashboard/icon 2.svg"
                                alt="communication"
                                boxSize="40px"
                                objectFit="contain"
                              />

                            </Flex>
                            <Text fontSize="12px" color="#6C757D" lineHeight={1.5}>
                              {/* Total Conversation */}
                              Replies Received
                            </Text>
                          </Box>
                          <Box
                            pos={'absolute'}
                            top={0}
                            left={'20px'}
                            right={0}
                            bottom={0}
                            zIndex={1}
                          >
                            <SvgExport2 />
                          </Box>
                        </Box>
                        <Box
                          className={styles.voiceDashCard}
                          pos={'relative'}
                          w="100%"
                          boxShadow={'0px 1px 4px 0px #0C0C0D0D'}
                          border="1px solid #E2E8F0"
                          p={'12px'}
                          bg={'#fff'}
                          borderRadius="8px"
                          lineHeight={'26px'}
                        >
                          <Box pos={'relative'} zIndex={1}>
                            {/* <Text fontSize="18px" lineHeight={'28px'} color="#1A202C" fontWeight={500}>
                              {dashboardData?.campaignSent}
                            </Text> */}
                            <Flex marginBottom={"16px"} justify="space-between" alignItems={"center"}>
                              <Text

                                fontSize={{ base: "18px", md: "24px" }}
                                fontWeight="600"
                                color="#6366F1"
                                lineHeight="1"
                              >
                                {dashboardData?.campaignSent}
                              </Text>
                              <Image
                                src="/dashboard/icon 3.svg"
                                alt="communication"
                                boxSize="40px"
                                objectFit="contain"
                              />

                            </Flex>
                            <Text fontSize="12px" color="#6C757D" lineHeight={1.5}>
                              {/* Number of Emails / Voice Calls */}
                              Outreach Sent
                            </Text>
                          </Box>
                          <Box
                            pos={'absolute'}
                            top={0}
                            left={'20px'}
                            right={0}
                            bottom={0}
                            zIndex={1}
                          >
                            <SvgExport2 />
                          </Box>
                        </Box>
                        <Box
                          className={styles.voiceDashCard}
                          pos={'relative'}
                          role="group"
                          w="100%"
                          boxShadow={'0px 1px 4px 0px #0C0C0D0D'}
                          border="1px solid #E2E8F0"
                          p={'12px'}
                          bg={'#fff'}
                          borderRadius="8px"
                          lineHeight={'26px'}
                          overflow="visible"  // 👈 Fix clipping issue

                        >
                          <Box pos={'relative'} >  {/* 👈 Higher zIndex than SVG */}
                            {/* <Box display={'flex'} zIndex={2} justifyContent={"space-between"} fontSize="18px" lineHeight={'28px'} color="#1A202C" fontWeight={500}>
                              {dashboardData?.leadgenerationRate > 100 ? '100' : dashboardData?.leadgenerationRate}%
                              <Popover isOpen={titleOpen} onClose={() => setTitleOpen(false)}>
                                <PopoverTrigger>
                                  <Box
                                    cursor="pointer"
                                    as="span"
                                    position="relative"
                                    zIndex={3}  // 👈 Ensure trigger is on top
                                    onClick={() => setTitleOpen(!titleOpen)}
                                  >
                                    <GoInfo color="#6C757D" />
                                  </Box>
                                </PopoverTrigger>
                                <PopoverContent
                                  bg="#efefef"
                                  fontWeight={500}
                                  color="#333"
                                  p={3}
                                  width="250px"
                                  fontSize="12px"
                                  border="1px solid #ccc"
                                  lineHeight="20px"
                                  style={{ boxShadow: 'none' }}
                                  borderRadius="4px"
                                  zIndex={9999}  // 👈 Popover content above everything
                                >
                                  <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                                  <Box whiteSpace="pre-wrap">Lead Conversion Rate excludes Zapier CRM leads.</Box>
                                </PopoverContent>
                              </Popover>
                            </Box> */}
                            <Flex marginBottom={"16px"} justify="space-between" alignItems={"center"}>
                              <Text
                                fontSize={{ base: "18px", sm: "20px", md: "24px" }}
                                fontWeight="600"
                                color="#15AF4E"
                                lineHeight="1"
                              >
                                {dashboardData?.leadgenerationRate > 100 ? '100' : dashboardData?.leadgenerationRate}%
                              </Text>
                              <Image
                                src="/dashboard/icon 4.svg"
                                alt="communication"
                                boxSize="40px"
                                objectFit="contain"
                              />

                            </Flex>
                            <Text fontSize="12px" color="#6C757D" lineHeight={1.5}>
                              {/* Lead Conversation Rate */}
                              Reply Rate
                            </Text>
                          </Box>

                          {/* SVG: pointerEvents="none" so hover on card works but clicks pass through */}
                          <Box
                            pos={'absolute'}
                            top={0}
                            left={'20px'}
                            right={0}
                            bottom={0}
                            zIndex={1}  // 👈 Lower than content
                          // pointerEvents="none"  // 👈 Keeps hover effect, blocks no clicks
                          >
                            <SvgExport2 />
                          </Box>
                        </Box>
                        <Box
                          className={styles.voiceDashCard}
                          pos={'relative'}
                          w="100%"
                          boxShadow={'0px 1px 4px 0px #0C0C0D0D'}
                          border="1px solid #E2E8F0"
                          p={'12px'}
                          bg={'#fff'}
                          borderRadius="8px"
                          lineHeight={'26px'}
                        >
                          <Box pos={'relative'} zIndex={1}>
                            <Flex marginBottom={"16px"} justify="space-between" alignItems={"center"}>
                              <Text
                                fontSize={{ base: "18px", sm: "20px", md: "24px" }}
                                fontWeight="600"
                                color="#F49E0D"
                                lineHeight="1"
                              >
                                {dashboardData?.appointmentBookingRate === null || dashboardData?.appointmentBookingRate > 100 ? '100' : dashboardData?.appointmentBookingRate}%
                              </Text>
                              <Image
                                src="/dashboard/icon 5.svg"
                                alt="communication"
                                boxSize="40px"
                                objectFit="contain"
                              />

                            </Flex>
                            <Text fontSize="12px" color="#6C757D" lineHeight={1.5}>
                              {/* Appointment Booking */}
                              Meetings Booked
                            </Text>
                          </Box>
                          <Box
                            pos={'absolute'}
                            top={0}
                            left={'20px'}
                            right={0}
                            bottom={0}
                            zIndex={1}
                          >
                            <SvgExport2 />
                          </Box>
                        </Box>
                      </HStack>
                      {
                        dashboardData?.campaignStatusCount?.isVisible && <>
                          <HStack spacing="24px" mt={'24px'}>
                            <Text lineHeight={'24px'} fontSize={'16px'} fontWeight={600}>Campaign Status Count</Text>
                          </HStack>
                          <HStack mt={'16px'} spacing="24px" >
                            <Box
                              className={styles.voiceDashCard + " " + styles.voiceDashCardInitiated}
                              pos={'relative'}
                              w="100%"
                              boxShadow={'0px 1px 4px 0px #0C0C0D0D'}
                              border="1px solid #E2E8F0"
                              p={'12px'}
                              bg={'#fff'}
                              borderRadius="8px"
                              lineHeight={'26px'}
                            >
                              <Flex justifyContent={"space-between"} alignItems={"center"} >
                                <Box pos={'relative'} zIndex={1}>
                                  <Text fontSize="18px" lineHeight={'28px'} sx={{
                                    userSelect: "none",        // ✅ disables text selection
                                    WebkitUserSelect: "none",  // ✅ Safari support
                                    MozUserSelect: "none",     // ✅ Firefox
                                    msUserSelect: "none",      // ✅ IE/Edge legacy
                                  }} color="#1A202C" fontWeight={500}>
                                    {dashboardData?.campaignStatusCount?.initiated}
                                  </Text>
                                  <Text fontSize="12px" color="#6C757D" lineHeight={1.5}>
                                    Initiated
                                  </Text>
                                </Box>

                                <Image
                                  src="/dashboard/icon 6.svg"
                                  alt="communication"
                                  boxSize="40px"
                                  objectFit="contain"
                                />

                              </Flex>
                              <Box
                                pos={'absolute'}
                                top={0}
                                left={'20px'}
                                right={0}
                                bottom={0}
                                zIndex={1}
                              >
                                <SvgExport2 />
                              </Box>
                            </Box>
                            <Box
                              className={styles.voiceDashCard + " " + styles.voiceDashCardRunning}
                              pos={'relative'}
                              w="100%"
                              boxShadow={'0px 1px 4px 0px #0C0C0D0D'}
                              border="1px solid #E2E8F0"
                              p={'12px'}
                              bg={'#fff'}
                              borderRadius="8px"
                              lineHeight={'26px'}
                            >
                              <Flex justifyContent={"space-between"} alignItems={"center"} >

                                <Box pos={'relative'} zIndex={1}>
                                  <Text fontSize="18px" lineHeight={'28px'} sx={{
                                    userSelect: "none",        // ✅ disables text selection
                                    WebkitUserSelect: "none",  // ✅ Safari support
                                    MozUserSelect: "none",     // ✅ Firefox
                                    msUserSelect: "none",      // ✅ IE/Edge legacy
                                  }} color="#1A202C" fontWeight={500}>
                                    {dashboardData?.campaignStatusCount?.running}
                                  </Text>
                                  <Text fontSize="12px" color="#6C757D" lineHeight={1.5}>
                                    Running
                                  </Text>
                                </Box>

                                <Image
                                  src="/dashboard/icon 6-1.svg"
                                  alt="communication"
                                  boxSize="40px"
                                  objectFit="contain"
                                />

                              </Flex>
                              <Box
                                pos={'absolute'}
                                top={0}
                                left={'20px'}
                                right={0}
                                bottom={0}
                                zIndex={1}
                              >
                                <SvgExport2 />
                              </Box>
                            </Box>
                            <Box
                              className={styles.voiceDashCard + " " + styles.voiceDashCardCompleted}
                              pos={'relative'}
                              w="100%"
                              boxShadow={'0px 1px 4px 0px #0C0C0D0D'}
                              border="1px solid #E2E8F0"
                              p={'12px'}
                              bg={'#fff'}
                              borderRadius="8px"
                              lineHeight={'26px'}
                            >
                              <Flex justifyContent={"space-between"} alignItems={"center"} >
                                <Box pos={'relative'} zIndex={1} sx={{
                                  userSelect: "none",        // ✅ disables text selection
                                  WebkitUserSelect: "none",  // ✅ Safari support
                                  MozUserSelect: "none",     // ✅ Firefox
                                  msUserSelect: "none",      // ✅ IE/Edge legacy
                                }}>
                                  <Text fontSize="18px" lineHeight={'28px'} color="#1A202C" fontWeight={500}>
                                    {dashboardData?.campaignStatusCount?.completed}
                                  </Text>
                                  <Text fontSize="12px" color="#6C757D" lineHeight={1.5}>
                                    Completed
                                  </Text>
                                </Box>
                                <Image
                                  src="/dashboard/icon 6-2.svg"
                                  alt="communication"
                                  boxSize="40px"
                                  objectFit="contain"
                                />

                              </Flex>
                              <Box
                                pos={'absolute'}
                                top={0}
                                left={'20px'}
                                right={0}
                                bottom={0}
                                zIndex={1}
                              >
                                <SvgExport2 />
                              </Box>
                            </Box>
                            <Box
                              className={styles.voiceDashCard + " " + styles.voiceDashCardPending}
                              pos={'relative'}
                              w="100%"
                              boxShadow={'0px 1px 4px 0px #0C0C0D0D'}
                              border="1px solid #E2E8F0"
                              p={'12px'}
                              bg={'#fff'}
                              borderRadius="8px"
                              lineHeight={'26px'}
                            >

                              <Flex justifyContent={"space-between"} alignItems={"center"} >
                                <Box pos={'relative'} zIndex={1} sx={{
                                  userSelect: "none",        // ✅ disables text selection
                                  WebkitUserSelect: "none",  // ✅ Safari support
                                  MozUserSelect: "none",     // ✅ Firefox
                                  msUserSelect: "none",      // ✅ IE/Edge legacy
                                }}>
                                  <Text fontSize="18px" lineHeight={'28px'} color="#1A202C" fontWeight={500}>
                                    {dashboardData?.campaignStatusCount?.paused}
                                  </Text>
                                  <Text fontSize="12px" color="#6C757D" lineHeight={1.5}>
                                    Paused
                                  </Text>
                                </Box>
                                <Image
                                  src="/dashboard/icon 6-3.svg"
                                  alt="communication"
                                  boxSize="40px"
                                  objectFit="contain"
                                />

                              </Flex>
                              <Box
                                pos={'absolute'}
                                top={0}
                                left={'20px'}
                                right={0}
                                bottom={0}
                                zIndex={1}
                              >
                                <SvgExport2 />
                              </Box>
                            </Box>
                            <Box
                              className={styles.voiceDashCard + " " + styles.voiceDashCardFailed}
                              pos={'relative'}
                              w="100%"
                              boxShadow={'0px 1px 4px 0px #0C0C0D0D'}
                              border="1px solid #E2E8F0"
                              p={'12px'}
                              bg={'#fff'}
                              borderRadius="8px"
                              lineHeight={'26px'}
                            >
                              <Flex justifyContent={"space-between"} alignItems={"center"} >
                                <Box pos={'relative'} zIndex={1}>
                                  <Text fontSize="18px" lineHeight={'28px'} color="#1A202C" fontWeight={500}>
                                    {dashboardData?.campaignStatusCount?.failed}
                                  </Text>
                                  <Text fontSize="12px" color="#6C757D" lineHeight={1.5}>
                                    Failed
                                  </Text>
                                </Box>

                                <Image
                                  src="/dashboard/icon 6-4.svg"
                                  alt="communication"
                                  boxSize="40px"
                                  objectFit="contain"
                                />

                              </Flex>
                              <Box
                                pos={'absolute'}
                                top={0}
                                left={'20px'}
                                right={0}
                                bottom={0}
                                zIndex={1}
                              >
                                <SvgExport2 />
                              </Box>
                            </Box>
                          </HStack>
                        </>
                      }
                    </Box>
                    {/* new ai section added */}


                    <Box mt={'24px'} w="100%" maxW="100%">
                      <HStack spacing="24px" alignItems={'flex-start'}>
                        <Box w="100%">
                          <Box
                            w="100%"
                            boxShadow={'0px 1px 4px 0px #0C0C0D0D'}
                            border="1px solid #E2E8F0"
                            p={'12px'}
                            bg={'#fff'}
                            borderRadius="8px"
                            pos={'relative'}
                          >
                            <Box pos={'absolute'} left={'20px'} top={'53%'} transformOrigin={0} transform={'rotate(-90deg)'}>
                              <Text color={'#6C757D'} lineHeight={'20px'} fontSize={'14px'}>Success Rate</Text></Box>
                            <Box
                              display="flex"
                              flexDirection="row"
                              justifyContent="space-between"
                              gap={2}
                              p={'12px'}
                              alignItems="center"
                              flexWrap={'nowrap'}
                            >
                              <Heading fontSize={'16px'} fontWeight={600} lineHeight={'24px'}>
                                Lead Analytics
                              </Heading>
                            </Box>
                            <ResponsiveContainer width="100%" height={400}>
                              <LineChart
                                data={dashboardData?.monthAndYearWiseLeadsGenerated}
                                margin={{ top: 30, right: 10, left: 0, bottom: 5 }}
                              >
                                <CartesianGrid stroke="#0000000F" />
                                <XAxis dataKey="name" axisLine={{ stroke: "#e2e8f0" }}
                                  tick={{ fontSize: 12, fill: "#00000099" }}
                                  tickLine={{ stroke: "#e2e8f0" }} />
                                <YAxis axisLine={{ stroke: "#e2e8f0" }}
                                  tick={{ fontSize: 12, fill: "#00000099" }}
                                  tickLine={{ stroke: "#e2e8f0" }} />
                                {/* <Tooltip /> */}
                                <Tooltip
                                  formatter={(value, name) => {
                                    const formattedName =
                                      name === "EmailAssistant"
                                        ? "Email Assistant"
                                        : name === "EmailOutreach"
                                          ? "Email Outreach"
                                          : name;

                                    return [value, formattedName];
                                  }}
                                />
                                {/* <Legend /> */}

                                <Line
                                  type="monotone"
                                  dataKey="ChatBot"
                                  stroke="#007AFF"
                                  activeDot={{ r: 8 }}
                                />
                                {/* <Line
                                  type="monotone"
                                  dataKey="EmailBot"
                                  stroke="#6200EE"
                                /> */}
                                <Line
                                  type="monotone"
                                  dataKey="EmailAssistant"
                                  stroke="#6200EE"
                                />
                                <Line
                                  type="monotone"
                                  dataKey="EmailOutreach"
                                  stroke="#CB30E0"
                                />
                                <Line
                                  type="monotone"
                                  dataKey="VoiceBot"
                                  stroke="#FF9500"
                                />
                                {/* <Line
                                  type="monotone"
                                  dataKey="ZapierCRM"
                                  stroke="#FF4A00"
                                  activeDot={{ r: 8 }}
                                /> */}
                              </LineChart>
                            </ResponsiveContainer>
                            <CustomLegend />
                          </Box>
                        </Box>
                      </HStack>
                    </Box>
                    <Box mt={'24px !important'} w="100%" maxW="100%">
                      <HStack spacing="24px" alignItems={'flex-start'}>
                        <Box w="370px">
                          <Box
                            w="370px"
                            boxShadow={'0px 1px 4px 0px #0C0C0D0D'}
                            border="1px solid #E2E8F0"
                            p={'16px'}
                            bg={'#fff'}
                            borderRadius="8px"
                          >
                            <Heading fontSize={'16px'} fontWeight={600} lineHeight={'24px'}>
                              Leads Generated
                            </Heading>
                            <Box mt={`15px`}
                              sx={{
                                transform: "translateX(-35px)",
                              }}
                            >
                              {/*  transform: "translateX(-46px)" */}
                              <ResponsiveContainer style={{ margin: "auto", marginTop: "10px" }} width={362} height={275}>
                                <BarChart data={dataBar}>
                                  <defs>
                                    {dataBar.map((entry) => (
                                      <linearGradient
                                        key={entry.gradientId}
                                        id={entry.gradientId}
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                      >
                                        <stop offset="0%" stopColor={entry.colorStart} />
                                        <stop offset="100%" stopColor="#FFFFFF" />
                                      </linearGradient>
                                    ))}
                                  </defs>
                                  <CartesianGrid strokeDasharray="" vertical={false} stroke="#ccc" />
                                  <XAxis dataKey="name" tick={renderCustomXAxisTick} axisLine={{ stroke: "#E0E0E0", strokeWidth: 1.5 }} tickLine={{ stroke: "#E0E0E0", strokeWidth: 1.5 }} interval={0} height={60} />
                                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#1A202C", textAnchor: "middle" }} />
                                  <Tooltip cursor={false} content={<CustomTooltip />} />
                                  <Bar
                                    dataKey="value"
                                    barSize={56}
                                    radius={[8, 8, 0, 0]}
                                    shape={<CustomBar />}
                                  >
                                    {dataBar.map((entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={`url(#${entry.gradientId})`}
                                        stroke={entry.colorStart}
                                        strokeWidth={1.5}
                                      />
                                    ))}

                                    <LabelList
                                      dataKey="value"
                                      position="insideTop"
                                      content={(props: any) => {
                                        const { x, y, width, value }: any = props;

                                        return (
                                          <text
                                            x={x + width / 2}
                                            y={y + 22}
                                            fill="#FFFFFF"
                                            fontSize={14}
                                            fontWeight="400"
                                            textAnchor="middle"
                                          >
                                            {value}
                                          </text>
                                        );
                                      }}
                                    />
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </Box>
                          </Box>
                        </Box>
                        <Flex w="calc(100% - 416px)" gap={6}>


                          {/* new section */}
                          <RecentLeadsMessage data={dashboardData} />

                        </Flex>
                      </HStack>
                    </Box >
                    {
                      dashboardData?.recentVoiceCalls?.isVisible &&
                      <Box
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="xl"
                        p={6}
                        shadow="sm"
                        w="100%"
                      >

                        <VStack w="100%" spacing="10">
                          <Flex width="100%" alignItems={"center"} py={0} my={0} justifyContent="space-between" gap={2} flexWrap={"wrap"}>
                            <Heading fontSize="16px" fontWeight={"600"} color="#1A202C"
                              display="flex"
                              alignItems="center"
                              gap="6px"
                            >
                              Recent Voice Calls

                              <Popover>
                                <PopoverTrigger>
                                  <Box
                                    cursor="pointer"
                                    as="span"
                                  >
                                    <GoInfo color="#6C757D" />
                                  </Box>
                                </PopoverTrigger>
                                <PopoverContent
                                  bg="#efefef"
                                  fontWeight={500}
                                  color="#333"
                                  p={3}
                                  width="250px"
                                  fontSize="12px"
                                  border="1px solid #ccc"
                                  lineHeight="20px"
                                  style={{ boxShadow: 'none' }}
                                  borderRadius="4px"
                                >
                                  <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                                  {/* <PopoverCloseButton /> */}
                                  <Box whiteSpace="pre-wrap">Date-based filtering is not available for this table.
                                  </Box>
                                </PopoverContent>
                              </Popover>
                            </Heading>

                          </Flex>
                        </VStack>
                        <Box minW="100%" w="600px" >
                          <TableContainer
                            mt="16px"
                            w="100%"
                            maxH="calc(100vh - 230px)"
                            border="1px solid #E2E8F0"
                            borderRadius="8px"
                            overflowY="auto"
                            boxShadow="sm"
                            sx={{
                              "::-webkit-scrollbar": {
                                display: "none",
                              },
                            }}
                          >
                            <Table variant="simple" fontSize="14px">
                              <Thead bg="#e3f3ff" position="sticky" top={0} zIndex={1}>
                                <Tr>
                                  <Th>#</Th>
                                  <Th>Phone Number</Th>
                                  <Th>Call Type</Th>
                                  <Th>Duration</Th>
                                  <Th>Voice Records</Th>
                                  <Th>Date</Th>
                                </Tr>
                              </Thead>
                              <Tbody bg={"#fff"}>
                                {false ? (
                                  <Tr>
                                    <Td colSpan={7} textAlign="center" py={8}>
                                      <Spinner display={'flex'} alignItems={'center'} justifyContent={'center'} margin={'auto'} marginTop={'50px'} marginBottom={'50px'} />
                                    </Td>
                                  </Tr>
                                ) : dashboardData?.recentVoiceCalls?.data && dashboardData?.recentVoiceCalls?.data.length > 0 ? (
                                  dashboardData?.recentVoiceCalls?.data?.map((item: any, index: any) => (
                                    <Tr key={index}>
                                      <Td>{index + 1}</Td>
                                      <Td minW={"170px"}>
                                        <Box display="flex" alignItems="center" gap="6px">
                                          <Image src="/icons/ic-phone.svg" alt="email icon" boxSize="16px" />
                                          <Text color={"#888888"}>{item?.phoneNumber || "N/A"}</Text>
                                        </Box>
                                      </Td>
                                      <Td>
                                        <Box display="flex" alignItems="center" gap="6px" minW="150px">
                                          <Image src={`/icons/${item?.callType === "Outgoing" ? "ic-outgoing" : "ic-incoming call"}.svg`} alt='icon' />
                                          <Text color="#888888" >{item?.callType || "N/A"}</Text>
                                          {/* <Text color="#888888" >{item?.callType || "N/A"}</Text> */}
                                        </Box>

                                      </Td>
                                      <Td color={"#888888"}>

                                        {item?.callDuration || "N/A"}
                                      </Td>
                                      <Td color={"#888888"}>
                                        {
                                          item?.recordingUrl == "N/A" || item?.recordingUrl == "" || item?.recordingUrl == null ? "N/A" :
                                            <Flex alignItems={"center"} gap={"8px"}>
                                              {/* <Tooltip label={"Play Recording"} fontSize={'10px'}> */}
                                              <Button
                                                size="sm"
                                                p="4px 8px"
                                                onClick={() => {
                                                  setShowSummaryModal({ ...item, voiceBotRecordingURL: `${baseURL}voicebot/stream-recording/${item?._id}`, type: "voicebot" })
                                                }}
                                              >
                                                <Image src={`/icons/ic-play.svg`} alt='icon' />

                                              </Button>
                                              {/* </Tooltip> */}
                                              <Text>Listen Recording</Text>

                                            </Flex>
                                        }
                                      </Td>
                                      <Td color={"#888888"}>{
                                        item?.createdAt ? formatDateTime(item?.createdAt, (item?.timeZone || 'UTC')) : "NA"
                                        // format(new Date(item?.createdAt), 'dd/MM/yyyy, hh:mm a')
                                      }</Td>
                                    </Tr>
                                  ))
                                ) : (
                                  <Tr>
                                    <Td colSpan={7} textAlign="center" py={8}>
                                      <Text color="#888888">No data found</Text>
                                    </Td>
                                  </Tr>
                                )}
                              </Tbody>
                            </Table>
                          </TableContainer>

                        </Box>
                      </Box>
                    }
                  </>
                )}
              </VStack >}

            <SummaryModal isOpen={showSummaryModal} onClose={() => { setShowSummaryModal({}) }} />

          </>
      }
    </Box >
  );
};

export default GlobalDashboard;