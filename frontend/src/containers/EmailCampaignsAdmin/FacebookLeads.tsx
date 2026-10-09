import { Box, Button, Flex, FormControl, FormErrorMessage, FormLabel, Input, Popover, PopoverArrow, PopoverContent, PopoverTrigger, Select, Text } from "@chakra-ui/react";
import { GoInfo } from "react-icons/go";
import React from "react";
import { useForm } from "react-hook-form";
import { facebookScrapeLeadsData } from "../../services/UltimaReviewsConnection";
import { useHistory } from "react-router-dom";

const FacebookLeads = ({ dataForClose, campaignId, campaignName, setIsOpenCampaignTrigger, delCampaignEmail, leadsForFacebook }: any) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [emailLeads, setEmailLeads] = React.useState([]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      query: "",
      limit: null
    },
  });

  const history = useHistory();
  const handleProceed = () => {
    dataForClose();
    history.push(`/app/email-campaigns?campaignId=${campaignId}&campaignName=${campaignName}&targetAudience=${true}`);
    setIsOpenCampaignTrigger(true);
  }
  const onSubmit = async (data: any) => {
    // console.log("Form Data: ", data);
    const payload = {
      ...data,
      limit: parseInt(data.limit),
      campaignId
    };
    try {
      setEmailLeads([]);
      setIsSubmitting(true);
      const response: any = await facebookScrapeLeadsData(payload);
      if (response.status === 200) {
        const formattedData = response.data.data.map((item: any) => ({
          email: item.email
        }));
        setEmailLeads(formattedData);
        reset();
      } else {

      }
    }
    catch (error) {
      // console.error("Error fetching email leads:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (leadsForFacebook.length > 0) {
      setEmailLeads(leadsForFacebook);
    }
  }
    , [leadsForFacebook]);

  return (
    <Box>
      <form>
        <FormControl isInvalid={!!errors.query} mb={4}>
          <FormLabel htmlFor="query">Query
            <Popover isOpen={infoOpen} onClose={() => setInfoOpen(false)}>
              <PopoverTrigger>
                <Box
                  cursor="pointer"
                  as="span"
                  onClick={() => setInfoOpen(!infoOpen)}
                >
                  <GoInfo color="#6C757D" />
                </Box>
              </PopoverTrigger>
              <PopoverContent
                bg="#efefef"
                fontWeight={500}
                color="#333"
                p={4}
                width="250px"
                fontSize="12px"
                border="1px solid #ccc"
                lineHeight="20px"
                style={{ boxShadow: 'none' }}
                borderRadius="4px"
              >
                <PopoverArrow bg="#efefef" transform="scale(1.5)" />
                {/* <PopoverCloseButton /> */}
                <Box whiteSpace="pre-wrap">
                  Enter keywords to search (e.g., real estate, website owner). Multiple queries allowed.
                </Box>
              </PopoverContent>
            </Popover>
            <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text>
          </FormLabel>
          <Input
            id="query"
            placeholder="Please enter your query"
            {...register("query", { required: "Query is required" })}
          />
          <FormErrorMessage>{errors.query?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.limit} mb={4}>
          <FormLabel htmlFor="limit">Limit  <Text as={"span"} fontSize="16px" fontWeight={"400"} style={{ color: "#DC3545" }}>*</Text></FormLabel>
          <Select
            width="auto"
            color="#6C757D"
            {...register('limit', { required: 'Limit is required' })}
          >
            <option value={''}>Select Limit</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </Select>
          <FormErrorMessage>{errors.limit?.message}</FormErrorMessage>
        </FormControl>

        {/* Optional Submit Button */}
        <FormControl textAlign={"right"}>
          <Button
            mt={4}
            colorScheme="blue"
            type="submit"
            isLoading={isSubmitting}
            // disabled={isSubmitting} 
            disabled={true}
            onClick={handleSubmit(onSubmit)}
          >
            Submit Query
          </Button>
        </FormControl>
      </form>
      {emailLeads.length > 0 &&
        <Box mt="24px" p={4} border={'1px solid #CED4DA'} borderRadius={'6px'} maxHeight={'350px'} overflowY={'auto'}>
          <Flex color={'#333'} fontSize={'15px'} alignItems="center" mb={2}>
            <Text w={'50%'} fontWeight={600}>Email</Text>
            <Text w={'50%'} fontWeight={600}>Action</Text>
          </Flex>
          {emailLeads.map((data: any, index: number) => (
            <Flex key={index} color={'#6C757D'} fontSize={'14px'} alignItems="center" mb={2}>
              <Text w={'calc(100% - 100px)'}>{data.email}</Text>
              <Text w={'100px'}>
                <Button
                  size="sm"
                  fontSize={12}
                  variant="outline"
                  borderColor="transparent"
                  onClick={() =>
                    delCampaignEmail(data?.email, campaignId)
                  }
                  mr={2}
                  sx={{
                    _focus: {
                      boxShadow: "none", // Removes the focus box shadow
                    },
                  }}
                >
                  <svg
                    width="14"
                    height="16"
                    viewBox="0 0 14 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.5 5.99921C4.63261 5.99921 4.75979 6.05189 4.85355 6.14565C4.94732 6.23942 5 6.3666 5 6.49921V12.4992C5 12.6318 4.94732 12.759 4.85355 12.8528C4.75979 12.9465 4.63261 12.9992 4.5 12.9992C4.36739 12.9992 4.24021 12.9465 4.14645 12.8528C4.05268 12.759 4 12.6318 4 12.4992V6.49921C4 6.3666 4.05268 6.23942 4.14645 6.14565C4.24021 6.05189 4.36739 5.99921 4.5 5.99921ZM7 5.99921C7.13261 5.99921 7.25979 6.05189 7.35355 6.14565C7.44732 6.23942 7.5 6.3666 7.5 6.49921V12.4992C7.5 12.6318 7.44732 12.759 7.35355 12.8528C7.25979 12.9465 7.13261 12.99921 7 12.99921C6.86739 12.99921 6.74021 12.9465 6.64645 12.8528C6.55268 12.759 6.5 12.6318 6.5 12.4992V6.49921C6.5 6.3666 6.55268 6.23942 6.64645 6.14565C6.74021 6.05189 6.86739 5.99921 7 5.99921ZM10 6.49921C10 6.3666 9.94732 6.23942 9.85355 6.14565C9.75979 6.05189 9.63261 5.99921 9.5 5.99921C9.36739 5.99921 9.24021 6.05189 9.14645 6.14565C9.05268 6.23942 9 6.3666 9 6.49921V12.4992C9 12.6318 9.05268 12.759 9.14645 12.8528C9.24021 12.9465 9.36739 12.99921 9.5 12.99921C9.63261 12.99921 9.75979 12.9465 9.85355 12.8528C9.94732 12.759 10 12.6318 10 12.4992V6.49921Z"
                      fill="#DC3545"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M13.5 3.49921C13.5 3.76442 13.3946 4.01878 13.2071 4.20631C13.0196 4.39385 12.7652 4.49921 12.5 4.49921H12V13.4992C12 14.0296 11.7893 14.5383 11.4142 14.9134C11.0391 15.2885 10.5304 15.4992 10 15.4992H4C3.46957 15.4992 2.96086 15.2885 2.58579 14.9134C2.21071 14.5383 2 14.0296 2 13.4992V4.49921H1.5C1.23478 4.49921 0.98043 4.39385 0.792893 4.20631C0.605357 4.01878 0.5 3.76442 0.5 3.49921V2.49921C0.5 2.23399 0.605357 1.97964 0.792893 1.7921C0.98043 1.60456 1.23478 1.49921 1.5 1.49921H5C5 1.23399 5.10536 0.979636 5.29289 0.7921C5.48043 0.604563 5.73478 0.499207 6 0.499207H8C8.26522 0.499207 8.51957 0.604563 8.70711 0.7921C8.89464 0.979636 9 1.23399 9 1.49921H12.5C12.7652 1.49921 13.0196 1.60456 13.2071 1.7921C13.3946 1.97964 13.5 2.23399 13.5 2.49921V3.49921ZM3.118 4.49921L3 4.55821V13.4992C3 13.7644 3.10536 14.0188 3.29289 14.2063C3.48043 14.3938 3.73478 14.4992 4 14.4992H10C10.2652 14.4992 10.5196 14.3938 10.7071 14.2063C10.8946 14.0188 11 13.7644 11 13.4992V4.55821L10.882 4.49921H3.118ZM1.5 3.49921V2.49921H12.5V3.49921H1.5Z"
                      fill="#DC3545"
                    />
                  </svg>
                </Button>
              </Text>
            </Flex>
          ))}
        </Box>
      }

      {emailLeads.length > 0 && <>
        <Button mt={4} colorScheme="blue" type="submit" isLoading={isSubmitting} disabled={isSubmitting} onClick={() => handleProceed()}>
          Proceed
        </Button>

      </>}
    </Box>
  );
};

export default FacebookLeads;
