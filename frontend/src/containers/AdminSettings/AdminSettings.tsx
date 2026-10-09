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
import ThresholdEmail from './ThresholdEmail';


const AdminSettings = () => {
	const [currentStep, setCurrentStep] = React.useState('Threshold Email');
	let history = useHistory();
	const location = useLocation();
	const queryParams = new URLSearchParams(location.search);
	const subtab = queryParams.get('subtab');


	React.useEffect(() => {
		if (
			// subtab === 'inboundCalling' ||
			subtab === 'Threshold Email' ||
			subtab === 'suppress' ||
			subtab === 'reminder' ||
			subtab === 'followUp'
		) {
			setCurrentStep(subtab);
		} else {
			setCurrentStep('Threshold Email');
		}
	}, [subtab]);
	const handleTabChanges = (index: any) => {
		// 'inboundCalling',
		const steps = ['Threshold Email', 'reminder', 'followUp', "suppress"];
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
							<Flex width="100%" mb="6" justifyContent="space-between">
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
						index={['Threshold Email', 'reminder', 'followUp', `suppress`].indexOf(
							currentStep,
						)}
					>
						<TabList position="relative" w="100%">

							<Tab
								id="tab-Threshold Email"
								// border="none"
								_focus={{ outline: 'none' }}
								_disabled={{ cursor: 'not-allowed', opacity: '0.4' }}
								style={{
									backgroundColor:
										currentStep === 'Threshold Email' ? '#fff' : '',
									color:
										currentStep === 'Threshold Email' ? '#2977FF' : '#495057',
								}}
								onClick={() => setCurrentStep('Threshold Email')}
							>
								Threshold Email
							</Tab>

						</TabList>

						<TabPanels>
							<TabPanel border="1px solid #DEE2E6" bg="#fff" p="24px 20px" borderBottomRadius={'8px'}>
								<ThresholdEmail />
							</TabPanel>
							<TabPanel border="1px solid #DEE2E6" bg="#fff" pt="16px">
							</TabPanel>
						</TabPanels>
					</Tabs>
				</Box>
			</Box>
		</>
	);
};

export default AdminSettings;
