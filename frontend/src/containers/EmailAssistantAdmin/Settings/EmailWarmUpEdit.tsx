import React, { ChangeEvent } from 'react';
import {
  Box, Flex, Heading, VStack, TableContainer,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td, Tabs, Tab, TabPanels, TabPanel,
  InputGroup,
  InputLeftElement,
  Input,
  Text,
  Image,
  Tooltip,
  Button,
  HStack,
  Select,
  TabList
} from '@chakra-ui/react';
import { useHistory, useLocation } from 'react-router-dom';
import { fetchAllSetings } from '../../../services/emailassistantservice';
// import WarmupSettings from './WarmupSettings';
const EmailWarmUpEdit = ({ details }: { details: any }) => {

  const [currentStep, setCurrentStep] = React.useState("warmUp");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(true);
  const [settingData, setSettingData] = React.useState<any>({});
  // console.log(settingData, "settingData");
  let history = useHistory();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);


  // console.log("location", location);

  const subtab = queryParams.get('subtab');

  React.useEffect(() => {
    if (subtab === 'warmUp' ||
      subtab === 'emailSetting' ||
      subtab === 'ruleSetup' ||
      subtab === 'unsubscribeEmail') {
      setCurrentStep(subtab);
    } else {
      setCurrentStep('warmUp');
    }
  }, [subtab]);
  const handleTabChanges = (index: any) => {
    const steps = [
      'warmUp',
      'emailSetting',
      'ruleSetup',
      'unsubscribeEmail',
    ];
    const newStep: any = steps[index];
    setCurrentStep(newStep);
    history.push(`?tab=settings&subtab=${newStep}`);
  };

  async function fetchSettingData() {
    try {
      setIsFetching(true);
      const response: any = await fetchAllSetings();
      // console.log(response.data, "folder api response");
      setSettingData(response.data);
    } catch (error) {
    } finally {
      setIsFetching(false);
    }
  }

  function capitalizeWords(str: string) {
    return str.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }

  React.useEffect(() => {
    fetchSettingData();
  }, []);




  return (<>
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
            <Flex width="100%" mb="6" justifyContent="space-between">
              <Box>
                <Heading fontSize="24px" color="#1A202C">Edit Details</Heading>
              </Box>
            </Flex>
          </Flex>
        </VStack>
      </Box>

      <Box width="100%" style={{ marginTop: "0px" }} >
        <Tabs variant="enclosed" w="100%" colorScheme='gray' size="md"
          position='relative'
          onChange={handleTabChanges}
          index={[
            'warmUp',
            'emailSetting',
            'ruleSetup',
            'unsubscribeEmail',
          ].indexOf(currentStep)}
        >


          <TabPanels>
            <TabPanel border="1px solid #DEE2E6" bg="#fff" p={0}>
              <Box display={"flex"} justifyContent={"center"}>
                {/* <WarmupSettings /> */}
              </Box>
            </TabPanel>

          </TabPanels>
        </Tabs>
      </Box>

    </Box>
  </>);
};

export default EmailWarmUpEdit;