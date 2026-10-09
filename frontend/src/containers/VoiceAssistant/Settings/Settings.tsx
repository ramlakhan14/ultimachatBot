import React from 'react';
import {
  Box,
  Flex,
  Heading,
  VStack,
  TabList,
  Tabs,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import { useHistory, useLocation } from 'react-router-dom';
import InboundCalling from './InboundCalling';
import OutboundCalling from './OutboundCalling';
import Reminder from './Reminder';
import FollowUps from './FollowUps';
import SuppressBlocked from './SuppressBlocked';

const VoicebotSettings = () => {
  const [currentStep, setCurrentStep] = React.useState('inboundCalling');
  // console.log(settingData, "settingData");
  let history = useHistory();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const subtab = queryParams.get('subtab');
  React.useEffect(() => {
    if (
      subtab === 'inboundCalling' ||
      subtab === 'outboundCalling' ||
      subtab === 'suppress' ||
      subtab === 'reminder' ||
      subtab === 'followUp'
    ) {
      setCurrentStep(subtab);
    } else {
      setCurrentStep('inboundCalling');
    }
  }, [subtab]);
  const handleTabChanges = (index: any) => {
    // 'inboundCalling',
    const steps = ['inboundCalling', 'outboundCalling', 'reminder', 'followUp', "suppress"];
    const newStep: any = steps[index];
    setCurrentStep(newStep);
    history.push(`?subtab=${newStep}`);
  };

  return (
    <>
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
              <Flex width="100%" mb="24px" justifyContent="space-between">
                <Box>
                  <Heading fontSize="24px" color="#1A202C">
                    Settings
                  </Heading>
                </Box>
              </Flex>
            </Flex>
          </VStack>
        </Box>
        <Box width="100%" style={{ marginTop: '0px' }}>
          <Tabs
            variant="enclosed"
            w="100%"
            colorScheme="gray"
            size="md"
            position="relative"
            onChange={handleTabChanges}
            index={['inboundCalling', 'outboundCalling', 'reminder', 'followUp', `suppress`].indexOf(
              currentStep,
            )}
          >
            <TabList position="relative" w="100%">
              <Tab
                id="tab-inboundCalling"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor:
                    currentStep === 'inboundCalling' ? '#fff' : '',
                  color:
                    currentStep === 'inboundCalling' ? '#495057' : '#2977FF',
                }}
                onClick={() => setCurrentStep('inboundCalling')}
              >
                Inbound Calling
              </Tab>
              <Tab
                id="tab-outboundCalling"
                // border="none"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor:
                    currentStep === 'outboundCalling' ? '#fff' : '',
                  color:
                    currentStep === 'outboundCalling' ? '#495057' : '#2977FF',
                }}
                onClick={() => setCurrentStep('outboundCalling')}
              >
                Outbound Calling
              </Tab>
              <Tab
                id="tab-reminder"
                // border="none"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor: currentStep === 'reminder' ? '#fff' : '',
                  color: currentStep === 'reminder' ? '#495057' : '#2977FF',
                }}
                onClick={() => setCurrentStep('reminder')}
              >
                Reminder
              </Tab>
              <Tab
                id="tab-followUp"
                // border="none"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor: currentStep === 'followUp' ? '#fff' : '',
                  color: currentStep === 'followUp' ? '#495057' : '#2977FF',
                }}
                onClick={() => setCurrentStep('followUp')}
              >
                Follow-Up
              </Tab>
              <Tab
                id="tab-suppress"
                // border="none"
                _focus={{ outline: 'none' }}
                _disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
                style={{
                  backgroundColor: currentStep === 'suppress' ? '#fff' : '',
                  color: currentStep === 'suppress' ? '#495057' : '#2977FF',
                }}
                onClick={() => setCurrentStep('suppress')}
              >
                Suppressed Numbers
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel border="1px solid #DEE2E6" borderBottomRadius="8px" bg="#fff" px="20px" py="24px">
                <InboundCalling />
              </TabPanel>
              <TabPanel border="1px solid #DEE2E6" borderBottomRadius="8px" bg="#fff" px="20px" py="24px">
                <OutboundCalling />
              </TabPanel>
              <TabPanel border="1px solid #DEE2E6" borderBottomRadius="8px" bg="#fff" px="20px" py="24px">
                <Reminder />
              </TabPanel>
              <TabPanel border="1px solid #DEE2E6" borderBottomRadius="8px" bg="#fff" px="20px" py="24px">
                <FollowUps />
              </TabPanel>
              <TabPanel border="1px solid #DEE2E6" borderBottomRadius="8px" bg="#fff" px="20px" py="24px">
                <SuppressBlocked />
              </TabPanel>
              {/* <TabPanel  border="1px solid #DEE2E6" bg="#fff" pt="16px">
                <UnsubscribeEmail />
              </TabPanel> */}
            </TabPanels>
          </Tabs>
        </Box>
      </Box>
    </>
  );
};

export default VoicebotSettings;
