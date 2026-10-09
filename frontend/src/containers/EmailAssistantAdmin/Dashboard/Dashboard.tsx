import { Box, Flex, Heading, VStack, HStack, Text, Image, Spinner } from '@chakra-ui/react';
import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Link } from 'react-router-dom';
// import Inbox from '../../../components/Icons/Inbox.svg';
import Draft from '../../../components/Icons/Draft.svg';
// import Spam from '../../../components/Icons/Spam.svg';
import FollowUp from '../../../components/Icons/Follow-up.svg';
// import Archived from '../../../components/Icons/Archived.svg';
// import Trash from '../../../components/Icons/Trash.svg';
import Unresolved from '../../../components/Icons/Unresolved.svg';
import ChatSummary from "../../../components/Icons/chatsummary.svg";
import AutoReplies from "../../../components/Icons/autoreplies.svg";
import ImgFolder from "../../../components/Icons/imgFolder.svg";
import styles from "../AllMail/AllMail.module.scss";
import SvgExport2 from "../AllMail/SvgExport2";
import LeadGenerated from "../../../components/Icons/Lead-generated.svg";
import { fetchDashboardData } from '../../../services/emailassistantservice';

const capitalizeWords = (str: string) => {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const excludeFolders = ["Email Summary", "Leads Generated", "Auto Replies", "Unresolved", "Followup Conversations", "Draft"];

const Dashboard = () => {
  const [isFetching, setIsFetching] = React.useState<boolean>(true);
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  async function fetchData() {
    try {
      setIsFetching(true);
      const response: any = await fetchDashboardData();
      setDashboardData(response.data);
    } catch (error) {
    } finally {
      setIsFetching(false);
    }
  }

  React.useEffect(() => {
    fetchData();
  }, []);

  const dataPie = [
    { name: 'Email Interactions', value: dashboardData?.emailInteraction?.totalReceived },
    { name: 'Emails Sent', value: dashboardData?.emailInteraction?.totalSent },
  ];

  const dataBar = [
    { name: 'Unresolved Emails', Leads: dashboardData?.unresolvedEmails },
    { name: 'Total Leads Generated', Leads: dashboardData?.totalLeadGenerated }
  ];

  const COLORS = ['#7C2FF1', '#2977FF'];

  // const menuItems = [
  //   { icon: <Image src={Inbox} className="w-5 h-5" />, label: 'All email conversations (Inbox)', count: 460 },
  //   { icon: <Image src={Draft} className="w-5 h-5" />, label: 'Draft', count: 400 },
  //   { icon: <Image src={Spam} className="w-5 h-5" />, label: 'Spam', count: 380 },
  //   { icon: <Image src={FollowUp} className="w-5 h-5" />, label: 'Follow-up conversations', count: 350 },
  //   { icon: <Image src={Archived} className="w-5 h-5" />, label: 'Archived', count: 300 },
  //   { icon: <Image src={Trash} className="w-5 h-5" />, label: 'Trash', count: 264 },
  //   { icon: <Image src={Unresolved} className="w-5 h-5" />, label: 'Unresolved', count: 100 },
  //   { icon: <Image src={LeadGenerated} className="w-5 h-5" />, label: 'Leads Generated', count: 130 }
  // ];

  const menuItems = dashboardData?.folders?.map((folder: any) => {
    let icon;
    const folderName = capitalizeWords(folder.folderName);

    if (folder.folderType === 'userCreated') {
      icon = <Image src={ImgFolder} style={{ width: '32px', height: '32px' }} />;
    } else {
      switch (folderName) {
        case 'Leads Generated':
          icon = <Image src={LeadGenerated} style={{ width: '32px', height: '32px' }} />;
          break;
        case 'Unresolved':
          icon = <Image src={Unresolved} style={{ width: '32px', height: '32px' }} />;
          break;
        case 'Auto Replies':
          icon = <Image src={AutoReplies} style={{ width: '32px', height: '32px' }} />;
          break;
        case 'Followup Conversations':
          icon = <Image src={FollowUp} style={{ width: '32px', height: '32px' }} />;
          break;
        case 'Draft':
          icon = <Image src={Draft} style={{ width: '32px', height: '32px' }} />;
          break;
        case 'Email Summary':
          icon = <Image src={ChatSummary} style={{ width: '32px', height: '32px' }} />;
          break;
        default:
          icon = null;
      }
    }

    const linkUrl = excludeFolders.includes(folderName)
      ? `/app/email-conversation/${folder._id}/${folder.folderName.toLowerCase().replace(/\s+/g, '-')}`
      : `/app/email-conversation/folder/user-created/${folder._id}/${folder.emailAccountId !== "" ? folder.emailAccountId : folder.category?.toLowerCase().replace(/\s+/g, '-')}`;


    return {
      icon,
      label: folderName,
      count: folder.count,
      linkUrl,
      folderType: folder.folderType,
      folderId: folder._id
    };
  }) || [];

  return (
    <Box
      w="100%"
      p="6"
      shadow="sm"
      h="100%"
      position="relative"
      overflow="auto"
    >
      <Box w="100%">
        <VStack w="100%" spacing="10">
          <Flex
            shrink={0}
            w="100%"
            direction="column"
            justifyContent="space-between"
          >
            <Flex width="100%" justifyContent="space-between">
              <Box>
                <Heading fontSize="24px" color="#1A202C">Assistant Dashboard</Heading>
              </Box>
            </Flex>
          </Flex>
        </VStack>
      </Box>
      {isFetching && <Spinner display={'flex'} alignItems={'center'} justifyContent={'center'} margin={'auto'} marginTop={'100px'} />}
      {!isFetching && <>
        <Box mt="24px">
          <HStack spacing='24px' align="normal">
            <Box className={styles.emailAssistantDashCard} pos={'relative'} w='100%' boxShadow={"0px 1px 4px 0px #0C0C0D0D"} border="1px solid #E2E8F0" p={'12px'} bg={'#fff'} borderRadius="8px" lineHeight={'26px'}>
              <Box pos={'relative'} zIndex={1}>
                <Text fontSize="18px" color="#1A202C" fontWeight={500}>{dashboardData?.emailInteraction?.totalReceived}/{dashboardData?.emailInteraction?.totalSent}</Text>
                <Text fontSize="12px" color="#6C757D">Email Interactions</Text>
              </Box>
              <Box pos={'absolute'} top={0} left={'20px'} right={0} bottom={0} zIndex={1}>
                <SvgExport2 />
              </Box>
            </Box>
            <Box className={styles.emailAssistantDashCard} pos={'relative'} w='100%' boxShadow={"0px 1px 4px 0px #0C0C0D0D"} border="1px solid #E2E8F0" p={'12px'} bg={'#fff'} borderRadius="8px" lineHeight={'26px'}>
              <Box pos={'relative'} zIndex={1}>
                <Text fontSize="18px" color="#1A202C" fontWeight={500}>{dashboardData?.responceRate.toFixed(2)}%</Text>
                <Text fontSize="12px" color="#6C757D">Response Rate</Text>
              </Box>
              <Box pos={'absolute'} top={0} left={'20px'} right={0} bottom={0} zIndex={1}>
                <SvgExport2 />
              </Box>
            </Box>
            <Box className={styles.emailAssistantDashCard} pos={'relative'} w='100%' boxShadow={"0px 1px 4px 0px #0C0C0D0D"} border="1px solid #E2E8F0" p={'12px'} bg={'#fff'} borderRadius="8px" lineHeight={'26px'}>
              <Box pos={'relative'} zIndex={1}>
                <Text fontSize="18px" color="#1A202C" fontWeight={500}>{dashboardData?.unresolvedEmails}</Text>
                <Text fontSize="12px" color="#6C757D">Unresolved Emails</Text>
              </Box>
              <Box pos={'absolute'} top={0} left={'20px'} right={0} bottom={0} zIndex={1}>
                <SvgExport2 />
              </Box>
            </Box>
            <Box className={styles.emailAssistantDashCard} pos={'relative'} w='100%' boxShadow={"0px 1px 4px 0px #0C0C0D0D"} border="1px solid #E2E8F0" p={'12px'} bg={'#fff'} borderRadius="8px" lineHeight={'26px'}>
              <Box pos={'relative'} zIndex={1}>
                <Text fontSize="18px" color="#1A202C" fontWeight={500}>{dashboardData?.totalLeadGenerated}</Text>
                <Text fontSize="12px" color="#6C757D">Total Leads Generated</Text>
              </Box>
              <Box pos={'absolute'} top={0} left={'20px'} right={0} bottom={0} zIndex={1}>
                <SvgExport2 />
              </Box>
            </Box>
          </HStack>
        </Box>
        <Box mt={'24px'}>
          <Box w="100%">
            {/* Custom breakpoint for 1700px */}
            <Box sx={{
              '@media screen and (min-width: 1700px)': {
                display: 'flex',
                gap: '24px',
                alignItems: 'flex-start'
              }
            }}>
              {/* First row content - always together */}
              <Box
                display="flex"
                flexDirection={{ base: 'column', xl: 'row' }}
                width="100%"
                gap={{ base: '16px', xl: '24px' }}
                mb={{ base: '16px', xl: 0 }}
                alignItems={{ base: 'center', xl: 'flex-start' }}
              >
                {/* Email Interaction Chart */}
                <Box
                  w={{ base: '100%', xl: '50%' }}
                  boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
                  border="1px solid #E2E8F0"
                  p={'16px'}
                  bg={'#fff'}
                  borderRadius="8px"
                  flex="1"
                >
                  <Heading fontSize={"16px"} fontWeight={600} lineHeight="24px">Email Interaction Chart</Heading>
                  <Box maxW="100%" overflow="hidden">
                    <Box mx="auto" w="fit-content">
                      <PieChart width={460} height={300} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <style>
                            {`
                          .recharts-layer:focus {
                            border: none !important;
                            outline: none !important;
                          }
                          .recharts-sector:focus {
                            border: none !important;
                            outline: none !important;
                          }
                        `}
                          </style>
                        </defs>
                        <Pie
                          data={dataPie}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={100}
                          labelLine={true}
                          label={({ name, x, y, textAnchor, index }) => (
                            <text
                              x={x}
                              y={y}
                              fill={COLORS[index]}
                              fontSize={12}
                              textAnchor={textAnchor}
                              dominantBaseline="central"
                            >
                              {name}
                            </text>
                          )}
                        >
                          {dataPie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}

                          {/* Number inside slice */}
                          <LabelList
                            dataKey="value"
                            content={(props) => {
                              const { value, viewBox } = props;

                              if (!viewBox) return null;

                              const {
                                cx,
                                cy,
                                startAngle,
                                endAngle,
                                innerRadius,
                                outerRadius,
                              }: any = viewBox;

                              const midAngle = (startAngle + endAngle) / 2;
                              const RADIAN = Math.PI / 180;
                              const radius = innerRadius + (outerRadius - innerRadius) / 2;

                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                              const y = cy + radius * Math.sin(-midAngle * RADIAN);

                              return (
                                <text
                                  x={x + 4}
                                  y={y - 1}
                                  fill="#fff"
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                >
                                  {value}
                                </text>
                              );
                            }}
                          />
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                      </PieChart>
                    </Box>
                  </Box>
                </Box>

                {/* Leads Generated */}
                <Box
                  w={{ base: '100%', xl: '50%' }}
                  boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
                  border="1px solid #E2E8F0"
                  p={'16px'}
                  bg={'#fff'}
                  borderRadius="8px"
                  flex="1"
                >
                  <Heading fontSize={"16px"} fontWeight={600} lineHeight={"24px"}>Leads Generated</Heading>
                  <Box maxW="100%" overflow="hidden" pt="40px">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={dataBar}>
                        <CartesianGrid strokeDasharray="" vertical={false} stroke="#ccc" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: "#1A202C" }}
                          tickLine={{ stroke: " #0000001F", strokeWidth: 1.5 }}
                        />
                        <YAxis
                          axisLine={false}
                          tick={{ fontSize: 12, fill: "#00000099" }}
                          tickLine={false}
                        />
                        <Tooltip cursor={false} />
                        {/* <Legend /> */}
                        <Bar dataKey="Leads" fill="#8884d8" barSize={76} radius={[2, 2, 0, 0]}>
                          {dataBar.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={"#256CE8"} />
                          ))}
                          <LabelList
                            dataKey="Leads"
                            position="insideBottom"
                            offset={18}
                            fontSize={14}
                            fill="#fff"
                            textAnchor="middle"
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>

              </Box>

              {/* Menu Items - Break to new row below 1700px */}
              <Box
                w="100%"
                mt={'24px'}
                sx={{
                  '@media screen and (min-width: 1700px)': {
                    width: '30%',
                    marginTop: '0',
                  }
                }}
              >
                <Box
                  w='100%'
                  boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
                  border="1px solid #E2E8F0"
                  bg={'#fff'}
                  className={styles.folderOverflow}
                  borderRadius="8px"
                >
                  {menuItems.map((item: any, index: number) => (
                    <Link
                      key={item.label}
                      to={item.linkUrl}
                      style={{ textDecoration: 'none' }}
                    >
                      <Box
                        display={'flex'}
                        width={'100%'}
                        justifyContent={'space-between'}
                        px={4}
                        py={4}
                        _hover={{ bg: 'slate.50' }}
                        borderBottom={index === menuItems.length - 1 ? 0 : '1px solid #E2E8F0'}
                      >
                        <Box
                          pos={'relative'}
                          display={'flex'}
                          gap={4}
                          alignItems={'center'}
                          width={"100%"}
                        >
                          <Box>
                            {item.icon}
                          </Box>
                          <Box display={'flex'} alignItems="center" gap={1} justifyContent="space-between" width={"100%"}>
                            <Text fontSize="16px" color="#1A202C" fontWeight={500} wordBreak={'break-all'}>{
                              item.label == "Followup Conversations" ? "Follow-up Conversations" :
                                item.label
                            }</Text>
                            <Text fontSize="14px" color="#6C757D">{item.count}</Text>
                          </Box>
                        </Box>
                      </Box>
                    </Link>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </>}
    </Box>
  );
};

export default Dashboard;