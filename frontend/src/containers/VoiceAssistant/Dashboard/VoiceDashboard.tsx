import {
  Box,
  Flex,
  Heading,
  VStack,
  HStack,
  Text,
  Image,
  Spinner,
  useToast,
  Button,
  Select,
  IconButton,
  Alert,
  MenuItem,
  AlertIcon,
  MenuList,
  AlertTitle,
  Radio,
  AlertDescription,
  Menu,
  MenuButton,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,

  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import styles from '../VoiceAssistant.module.scss';
import SvgExport2 from '../../EmailAssistantAdmin/AllMail/SvgExport2';
import meetIcon from '../Images/meet-icon.svg';
import timeIcon from '../Images/time.svg';
import DatePicker from './DatePicker';
import warning from '../Images/warning.svg';
import { getCalendarData, voicebotDashboard, updateMeetingStatus } from '../../../services/VoiceBot';
import { FiMoreHorizontal } from 'react-icons/fi';
export enum MeetingStatus {
  // Scheduled = "Scheduled",
  Cancelled = "Cancelled",
  Completed = "Completed",
}
export enum MeetingStatus2 {
  Scheduled = "Scheduled",
  Cancelled = "Cancelled",
  Completed = "Completed",
}
const Dashboard = () => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date());
  const [dashboardData, setDashboardData] = useState<any>({});
  const [dotData, setDotData] = useState<any>([]);
  const [meetings, setMeetings] = useState<any>([]);
  const [status, setStatus] = useState<MeetingStatus2>(MeetingStatus2.Scheduled);
  const toast = useToast();
  const formattedDate = selectedDateTime.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const currentDate = new Date();
  //Format: YYYY-MM
  const formattedYearMonth = currentDate.toISOString().slice(0, 7);
  // Format: YYYY-MM-DD
  const formattedFullDate = currentDate.toISOString().slice(0, 10);

  const getSelectTime = async (time: any) => {
    const clickedDate = time.split(' ')[0];
    setSelectedDateTime(new Date(clickedDate));
    const dateMonth = time.split('-').slice(0, 2).join('-');
    const firstDate = time.split(' ')[0];
    try {
      const responseDate = await getCalendarData(dateMonth, firstDate);
      setDotData(responseDate?.data?.dotData);
      setMeetings(responseDate?.data?.meetingsData);

    } catch (error) { }

  };
  const setCurrentMonth = async (time: any) => {
    try {
      const responseDate = await getCalendarData(time);
      setDotData(responseDate?.data?.dotData);
      setMeetings(responseDate?.data?.meetingsData);
    } catch (error) { }
  }

  // console.log(
  //   "dashboardData", dashboardData
  // )
  const data = [
    { name: 'Total Calls', value: dashboardData?.callByStatus?.totalCalls || 0 },
    { name: 'Leads Generated', value: dashboardData?.callByStatus?.leadGenerated || 0 },
    { name: 'Calls Connected', value: dashboardData?.callByStatus?.connectedCalls || 0 },
    { name: 'No Answered', value: dashboardData?.callByStatus?.customerDidNotAnswer || 0 },
    { name: 'Busy', value: dashboardData?.callByStatus?.customerBusy || 0 },
  ];

  // Check if all values in data array are 0
  const isEmptyData = data.every(item => item.value === 0);

  const currentYear = new Date().getFullYear();
  // Colors for each segment
  const COLORS = isEmptyData ? ['#ccd6e3'] : ['#256CE8', '#34C759', '#712BDB', '#EF4444', '#FF8D28',];
  // const COLORS = isEmptyData ? ['#ccd6e3'] : ['#34C759', '#7C2FF1', '#EF4444', '#FF8D28', '#FF8D28',];

  // Add this function to your component
  const lightenColor = (color: any, percent: any) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return `#${(
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)}`;
  };
  // Custom label that renders inside the chart segments
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    value,
    name,
  }: any) => {
    // Don't render labels if the value is 0
    if (value === 0) return null;

    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
    const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={14}
      >
        {value}
      </text>
    );
  };

  const onMouseEnter = (_: any, index: any) => {
    setActiveIndex(index);
  };

  const onMouseLeave = () => {
    setActiveIndex(null);
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const color = payload[0].color || payload[0].payload.fill;
      return (
        <div
          style={{
            backgroundColor: 'white',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              backgroundColor: color,
              marginRight: '8px',
            }}
          />
          <span style={{ marginLeft: '8px' }}>{payload[0].name}&nbsp;
            {payload[0].value.toLocaleString()}
          </span>
        </div >
      );
    }
    return null;
  };


  const fetchData = async () => {
    try {
      setIsFetching(true);
      const response: any = await voicebotDashboard();
      setDashboardData(response.data);
      const responseDate = await getCalendarData(formattedYearMonth, formattedFullDate);
      setDotData(responseDate?.data?.dotData);
      setMeetings(responseDate?.data?.meetingsData);
    } catch (error: any) {
      // Error handling
    } finally {
      setIsFetching(false);
    }
  };

  const updateStatus = async (meetingId: string, newStatus: string) => {
    const payload = {
      status: newStatus,
      id: meetingId,
    }
    try {
      const response = await updateMeetingStatus(payload); // Replace with your API endpoint
      // console.log('Response:', response.status);
      toast({
        title: `${response?.data?.message}`,
        status: "success",
        isClosable: true,
      })

      if (response.status === 200) {
        // Update the local state to reflect the change
        const updatedMeetings = meetings.map((meeting: any) =>
          meeting._id === meetingId ? { ...meeting, status: newStatus } : meeting
        );
        setMeetings(updatedMeetings);
        const response: any = await voicebotDashboard();
        setDashboardData(response.data);
      } else {
        // console.error('Failed to update meeting status');
      }
    } catch (error: any) {
      toast({
        title: `${error?.response?.data?.message}`,
        status: "error",
        isClosable: true,
      })
    }
  };


  React.useEffect(() => {
    fetchData();
  }, []);


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
      <VStack w="100%" spacing="10">
        <Flex shrink={0} w="100%" justifyContent="space-between">
          <Flex width="100%" justifyContent="space-between">
            <Box>
              <Heading fontSize="24px" color="#1A202C">
                VoiceBot Dashboard
              </Heading>
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
            <Box w="100%" maxW="100%" mt="24px !important">
              <HStack spacing="24px" align="normal">
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
                    <Text fontSize="18px" color="#1A202C" fontWeight={500} lineHeight="28px">
                      {dashboardData?.appointmentCompletetionRate}
                    </Text>
                    <Text fontSize="12px" color="#6C757D">
                      Appointment Completion Rate
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
                    <Text fontSize="18px" color="#1A202C" fontWeight={500} lineHeight="28px">
                      {dashboardData?.totalAudience}
                    </Text>
                    <Text fontSize="12px" color="#6C757D">
                      Total Audience
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
                    <Text fontSize="18px" color="#1A202C" fontWeight={500} lineHeight="28px">
                      {dashboardData?.totalCampaignsCompleted}/{dashboardData?.totalCampaigns}
                    </Text>
                    <Text fontSize="12px" color="#6C757D">
                      Campaign Completion Rate
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
                    <Text fontSize="18px" color="#1A202C" fontWeight={500} lineHeight="28px">
                      {dashboardData?.totalLeads}
                    </Text>
                    <Text fontSize="12px" color="#6C757D">
                      Total Leads Generated
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
            </Box>
            {dashboardData?.lowBalance &&
              <Box w={'100%'} style={{ marginTop: "24px" }}>
                <Alert
                  status="warning"
                  variant="subtle"
                  borderRadius="md"
                  border={'1px solid #FFB020'}
                  background={'#FFFAF1'}
                  w={'100%'}
                >
                  <Image src={warning} alt="warning" mr={2} />
                  <AlertDescription fontSize={'14px'} color={'#996A13'}>
                    Your credit balance is zero. Please purchase the plan and
                    create new campaign.{' '}
                  </AlertDescription>
                </Alert>
              </Box>}

            <Box mt={'24px !important'} w="100%" maxW="100%">
              <HStack spacing="24px" alignItems={'flex-start'}>
                <Box w="30%" maxW="30%">
                  <Box
                    w="100%"
                    boxShadow={'0px 1px 4px 0px #0C0C0D0D'}
                    border="1px solid #E2E8F0"
                    p={'12px'}
                    bg={'#fff'}
                    borderRadius="8px"
                    className="rechatdesing"
                  >
                    <Heading fontSize={'16px'} fontWeight={600} lineHeight="24px">
                      {/* Calls by Status */}
                      Call Analytics
                    </Heading>
                    <ResponsiveContainer
                      width={'100%'} height={332}>
                      <PieChart width={600} height={332}>
                        <Pie
                          data={isEmptyData ? [{ name: 'No Data', value: 1 }] : data}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={90}
                          fill="#000000"
                          labelLine={false}
                          label={isEmptyData ? undefined : renderCustomizedLabel}
                          onMouseEnter={onMouseEnter}
                          onMouseLeave={onMouseLeave}
                        >
                          {(isEmptyData ? [{ name: 'No Data', value: 1 }] : data).map((entry, index) => {
                            const color = COLORS[index % COLORS.length];
                            const isActive = index === activeIndex;
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  isEmptyData ? '#ccd6e3' : (isActive ? lightenColor(color, 20) : color)
                                }
                                strokeWidth={isActive ? 2 : 1}
                                stroke={isEmptyData ? '#ccd6e3' : (isActive ? color : color)}
                              />
                            );
                          })}
                        </Pie>
                        {!isEmptyData && <Tooltip content={<CustomTooltip />} />}
                        {!isEmptyData && <Legend verticalAlign="bottom" height={32} wrapperStyle={{ fontSize: "12px" }} />}
                        {isEmptyData && (
                          <text
                            x="50%"
                            y="50%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#6C757D"
                            fontSize="14px"
                          >
                            No data available
                          </text>
                        )}
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
                <Box w="70%" maxW="70%">
                  <Box
                    w="100%"
                    boxShadow={'0px 1px 4px 0px #0C0C0D0D'}
                    border="1px solid #E2E8F0"
                    bg={'#fff'}
                    borderRadius="8px"
                    display={'flex'}
                    height={'382px'}
                  >
                    <Box borderRight="1px solid #E2E8F0">
                      <Heading fontSize={'16px'} fontWeight={600} p={4} lineHeight="24px">
                        Scheduled Meetings
                      </Heading>
                      <DatePicker getSelectTime={getSelectTime} currentMonthSelected={setCurrentMonth} meetings={dotData} />
                    </Box>
                    <Box
                      p={4}
                      pt={0}
                      flexGrow={1}
                      height={'380px'}
                      overflowY={'auto'}
                      position={'relative'}
                    >
                      <Heading fontSize={'16px'} fontWeight={600} py={4} lineHeight={'24px'}>
                        Scheduled Meetings on {formattedDate}
                      </Heading>
                      {meetings?.length > 0 ? (
                        meetings?.map((meeting: any, index: number) => (
                          <Box
                            key={index}
                            border={'1px solid #e0e0e0'}
                            borderRadius={8}
                            p={3}
                            boxShadow={'0 2px 10px rgba(0, 0, 0, 0.1)'}
                            position={'relative'}
                            mt={index !== 0 ? 4 : 0}
                          >

                            <Text
                              fontSize={'16px'}
                              fontWeight={500}
                              color={'#1A202C'}
                              maxW={"calc(100% - 35px)"}
                            >
                              {meeting?.agenda}
                            </Text>
                            <Text
                              display={'flex'}
                              alignItems={'center'}
                              gap={1}
                              fontSize={'14px'}
                              // color="#6C757D"
                              mt={2}
                              color={!meeting?.isMeetingBookedOnGoogleMeet ? "red" : "#6C757D"}
                            >
                              <Image src={meetIcon} alt="meet icon" />
                              {!meeting?.isMeetingBookedOnGoogleMeet ? "Not on Google Meet" : "On Google Meet"
                              }

                            </Text>
                            <Text
                              display={'flex'}
                              alignItems={'center'}
                              gap={1}
                              fontSize={'12px'}
                              color="#2977FF"
                              mt={2}
                            >
                              <Image src={timeIcon} alt="time icon" />{' '}
                              {new Date(meeting?.startTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                              {' - '}
                              {new Date(meeting?.endTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </Text>
                            <Text
                              fontSize={'12px'}
                              color="#6C757D"
                            // mt={2}
                            >
                              {meeting?.status === 'Scheduled' && <Text as="span" color="#FF8D28"><Text as={'span'} fontSize={'15px'}>⦿</Text> {meeting?.status}</Text>}
                              {meeting?.status === 'Cancelled' && <Text as="span" color="red"><Text as={'span'} fontSize={'15px'}>⦿</Text> {meeting?.status}</Text>}
                              {meeting?.status === 'Completed' && <Text as="span" color="#24A144"><Text as={'span'} fontSize={'15px'}>⦿</Text> {meeting?.status}</Text>}
                              {meeting?.status &&
                                !['Scheduled', 'Cancelled', 'Completed'].includes(meeting?.status) && (
                                  <Text as="span" color="gray.500">
                                    <Text as="span" fontSize="15px">⦿</Text> {meeting?.status}
                                  </Text>
                                )}
                            </Text>
                            <HStack
                              position="absolute"
                              top="0%"
                              right="0%"
                            >
                              <Box position="relative" w="64" mr="10px" mt="10px">
                                <Flex justify="flex-end" mb={1}>
                                  <Menu placement="bottom-end">
                                    <MenuButton
                                      as={IconButton}
                                      minW='8'
                                      minH='8'
                                      h="8"
                                      aria-label='Options'
                                      icon={<FiMoreHorizontal />}
                                      color="#212529"
                                      variant='outline'
                                      backgroundColor="#F8F9FA"
                                    />
                                    <MenuList minW="40" zIndex={10}>
                                      {Object.values(MeetingStatus).map((statusOption: any) => {
                                        const isFutureMeeting = new Date(meeting.date) > new Date();
                                        const disableCompleted =
                                          isFutureMeeting && statusOption === "Completed";

                                        // console.log("statusOption", statusOption, meeting.status, isFutureMeeting, disableCompleted)
                                        return (
                                          <MenuItem
                                            key={statusOption}
                                            onClick={() => {
                                              // console.log("statusOption", disableCompleted, statusOption)
                                              if (!disableCompleted) {
                                                updateStatus(meeting._id, statusOption);
                                              }
                                            }}
                                            _hover={{ bg: "gray.50" }}
                                            bg={meeting.status === statusOption ? "blue.50" : "white"}
                                            color={meeting.status === statusOption ? "blue.600" : "gray.700"}
                                          >
                                            <Radio
                                              isChecked={meeting.status === statusOption}
                                              // pointerEvents="none"
                                              isDisabled={disableCompleted || (statusOption === "Completed")}
                                              // onChange={() => {
                                              //   // if (!disableCompleted || !(statusOption === "Completed")) {
                                              //   //   updateStatus(meeting._id, statusOption);
                                              //   // }
                                              //   // updateStatus(meeting._id, statusOption);
                                              // }}
                                              value={statusOption}
                                              colorScheme="blue"
                                              mr={2}
                                            />
                                            <Text>{statusOption}</Text>
                                          </MenuItem>
                                        )
                                      })}
                                    </MenuList>
                                  </Menu>
                                </Flex>
                              </Box>
                            </HStack>
                          </Box>
                        ))
                      ) : (
                        <Text position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" background="#efefef" p="3" borderRadius="5px">No meeting scheduled on {formattedDate}.</Text>
                      )}
                    </Box>
                  </Box>
                </Box>
              </HStack>
            </Box>
          </>
        )}
      </VStack>
    </Box >
  );
};

export default Dashboard;