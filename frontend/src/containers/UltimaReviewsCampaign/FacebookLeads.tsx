import { Box, Button, Flex, FormControl, FormErrorMessage, Text, FormLabel, Input, Select, Popover, PopoverArrow, PopoverContent, PopoverTrigger } from "@chakra-ui/react";
import { GoInfo } from "react-icons/go";
import React from "react";
import { useForm } from "react-hook-form";
import { facebookScrapeLeadsData } from "../../services/UltimaReviewsConnection";

const FacebookLeads = ({ emailLeads, setEmailLeads }: any) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
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
  const [infoOpen, setInfoOpen] = React.useState(false);

  const onSubmit = async (data: any) => {
    // console.log("Form Data: ", data);
    const payload = {
      query: data.query,
      limit: parseInt(data.limit)
    }
    try {
      setEmailLeads([]);
      setIsSubmitting(true);
      const response: any = await facebookScrapeLeadsData(payload);
      if (response.status === 200) {
        const formattedData = response.data.data.map((item: any) => ({
          email: item.email,
          businessName: item.name
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

  return (
    <Box>
      <form>
        <FormControl isInvalid={!!errors.query} mb={4}>
          <FormLabel htmlFor="query" display="flex" gap="4px" alignItems={"center"}>
            Query
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
            <Text as="span" fontSize="16px" fontWeight="400" color="#DC3545">*</Text>
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

        <FormControl textAlign={"right"}>
          <Button
            mt={4}
            colorScheme="blue"
            type="submit"
            fontWeight={500}
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
          <Flex color={'#333'} fontSize={'14px'} alignItems="center" mb={2}>
            <Text w={'50%'} fontWeight={600}>Email</Text>
            <Text w={'50%'} fontWeight={600}>Business Name</Text>
          </Flex>
          {emailLeads.map((data: any, index: number) => (
            <Flex key={index} color={'#6C757D'} fontSize={'14px'} alignItems="center" mb={2}>
              <Text w={'50%'}>{data.email}</Text>
              <Text w={'50%'}>{data.businessName}</Text>
            </Flex>
          ))}
        </Box>
      }
    </Box>
  );
};

export default FacebookLeads;
