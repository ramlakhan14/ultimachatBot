import React from 'react';
import { Box, Flex, Heading, VStack, TabList, Tabs, Tab, TabPanels, TabPanel } from '@chakra-ui/react';
import { useHistory, useLocation } from 'react-router-dom';
import AutoReplies from './AutoReplies';
import EmailSetting from './EmailSetting';
import RuleSetup from './RuleSetup';
import UnsubscribeEmail from './UnsubscribeEmail';
import { fetchAllSetings } from '../../../services/emailassistantservice';

const AssistantSettings = () => {

  const [currentStep, setCurrentStep] = React.useState("autoReplies");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(true);
  const [settingData, setSettingData] = React.useState<any>({});
  // console.log(settingData, "settingData");
  let history = useHistory();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const subtab = queryParams.get('subtab');

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

  React.useEffect(() => {
    if (subtab === 'autoReplies' ||
      subtab === 'emailSetting' ||
      subtab === 'ruleSetup' ||
      subtab === 'unsubscribeEmail') {
      setCurrentStep(subtab);
    } else {
      setCurrentStep('autoReplies');
    }
  }, [subtab]);
  const handleTabChanges = (index: any) => {
    const steps = [
      'autoReplies',
      'emailSetting',
      'ruleSetup',
      'unsubscribeEmail',
    ];
    const newStep: any = steps[index];
    setCurrentStep(newStep);
    history.push(`?tab=settings&subtab=${newStep}`);
  };
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
            <Flex width="100%" mb="8" justifyContent="space-between">
              <Box>
                <Heading fontSize="24px" color="#1A202C">Settings</Heading>
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
            'autoReplies',
            'emailSetting',
            'ruleSetup',
            'unsubscribeEmail',
          ].indexOf(currentStep)}
        >
          <TabList position="relative" w="100%">
            <Tab
              id="tab-autoReplies"
              isDisabled={isSubmitting}
              _focus={{ outline: "none" }}
              _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
              style={{
                backgroundColor: currentStep === "autoReplies" ? '#fff' : '',
                color: currentStep === "autoReplies" ? '#495057' : '#2977FF',

              }}
              onClick={() => setCurrentStep("autoReplies")}
            >
              Auto Replies
            </Tab>
            <Tab
              id="tab-emailSetting"
              isDisabled={isSubmitting}
              _focus={{ outline: "none" }}
              _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
              style={{
                backgroundColor: currentStep === "emailSetting" ? '#fff' : '',
                color: currentStep === "emailSetting" ? '#495057' : '#2977FF',

              }}
              onClick={() => setCurrentStep("emailSetting")}
            >
              Email Settings
            </Tab>
            <Tab
              id="tab-ruleSetup"
              isDisabled={isSubmitting}
              _focus={{ outline: "none" }}
              _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
              style={{
                backgroundColor: currentStep === "ruleSetup" ? '#fff' : '',
                color: currentStep === "ruleSetup" ? '#495057' : '#2977FF',

              }}
              onClick={() => setCurrentStep("ruleSetup")}
            >
              Rule Setup
            </Tab>
            <Tab
              id="tab-unsubscribeEmail"
              isDisabled={isSubmitting}
              _focus={{ outline: "none" }}
              _disabled={{ cursor: "not-allowed", opacity: "0.4" }}
              style={{
                backgroundColor: currentStep === "unsubscribeEmail" ? '#fff' : '',
                color: currentStep === "unsubscribeEmail" ? '#495057' : '#2977FF',

              }}
              onClick={() => setCurrentStep("unsubscribeEmail")}
            >
              Unsubscribe Email for Campaign
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel border="1px solid #DEE2E6" bg="#fff" px="20px" py="24px">
              <AutoReplies settingData={settingData?.autoReply} isFetching={isFetching} />
            </TabPanel>
            <TabPanel border="1px solid #DEE2E6" bg="#fff" px="20px" py="24px">
              <EmailSetting settingData={settingData?.emailSetting} isFetching={isFetching} />
            </TabPanel>
            <TabPanel border="1px solid #DEE2E6" bg="#fff" px="20px" py="24px">
              <RuleSetup settingData={settingData?.ruleSetup} isFetching={isFetching} />
            </TabPanel>
            <TabPanel border="1px solid #DEE2E6" bg="#fff" px="20px" py="24px">
              <UnsubscribeEmail />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  </>);
};

export default AssistantSettings;