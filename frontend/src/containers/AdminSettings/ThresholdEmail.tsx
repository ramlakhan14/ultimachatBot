import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Button, Checkbox, Flex, Heading, Image, Input, Radio, RadioGroup, Spinner, Stack, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr, useToast } from '@chakra-ui/react';
import { colors } from '../../utils/constant';
import { callApi } from '../../services/callApi';
import { format } from "date-fns";

interface PlanData {
  planName: string;
  limitValue: number;
  updatedAt: string;
}

const ThresholdEmail: React.FC = () => {
  const [data, setData] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [formData, setFormData] = useState<any>(true);
  const [isEdit, setEdit] = useState<any>({ 0: false, 1: false, 2: false });
  const [inputEnabled, setInputEnabled] = useState<any>({ 0: false });
  const toast = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await callApi('/admin-setting/threshold-email-setting', "get", ""); // Replace with your actual API endpoint
      // console.log(response, "response");
      setData(response.data);
    } catch (error) {
      // console.error('Error fetching plan limits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData()
  }, []);


  const saveChanges = async (payl: any, index: any) => {
    try {
      // console.log(payl, "payl");
      const response = await callApi('/admin-setting/threshold-email-setting', "patch", { ...payl, limitValue: Number(payl?.limitValue) }); // Replace with your actual API endpoint
      // console.log(response, "response");
      setEdit((pre: any) => {
        return {
          // ...pre,
          [index]: false
        }
      })
      toast({
        title: `${response.message || "Updated successfully"}`,
        status: "success",
        isClosable: true,
      });
      fetchData()

    } catch (error: any) {
      // console.log(error);
      toast({
        title: `${error?.response?.data?.message || "Something went wrong"}`,
        status: "error",
        isClosable: true,
      });
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number,
    name: any
  ) => {
    const { value } = e.target;

    setData((prevData) => {
      const updatedData = [...prevData]; // copy the array
      updatedData[index] = {
        ...updatedData[index], // copy the object at this index
        [name]: value,
        ...(name == "limitType" ? { limitValue: 0 } : {})       // update the specific field
      };
      return updatedData;
    });
  };



  return (

    <div>
      <Box>
        <Heading fontSize={'20px'} fontWeight={600}>Threshold Email Settings</Heading>
      </Box>
      <Box>

        <TableContainer
          maxH="calc(100vh - 255px)"
          mt={'24px'}
          w="100%"
          boxShadow={"0px 1px 4px 0px #0C0C0D0D"}
          bg={'#fff'}
          border="1px solid #E2E8F0"
          borderRadius="8px"
          sx={{
            overflow: "scroll!important",
            "::-webkit-scrollbar": {
              display: "none"
            }
          }}
        >
          <Table variant="simple">
            <Thead sx={{
              position: 'sticky',
              top: -1,
              zIndex: 1,
              fontSize: '14px',
              fontWeight: '600'
            }} bg={colors.tableHeadingBg}  >
              <Tr>
                <Th>#</Th>
                <Th>Plan Name </Th>
                <Th>Max Credits</Th>
                <Th>Threshold</Th>
                <Th>Updated At</Th>
                <Th textAlign={"end"}>Action</Th>

              </Tr>
            </Thead>
            <Tbody>
              {
                loading ? (
                  <Tr>
                    <Td colSpan={6} textAlign="center">
                      <div className="loader" style={{ textAlign: "center", display: "flex" }}><Spinner margin={'auto'} /> </div>
                    </Td>
                  </Tr>) :
                  data.length === 0 ? (
                    <Tr>
                      <Td colSpan={6} textAlign="center">
                        No data available
                      </Td>
                    </Tr>
                  ) : (
                    data.map((item: any, index: any) => (
                      <Tr key={index}>
                        <Td>{index + 1}</Td>
                        <Td>{item.planName}</Td>
                        <Td>
                          {
                            Number(item?.maxTokens)
                          }
                        </Td>
                        <Td textAlign={"end"}>
                          <Box display="flex" alignItems="center" gap={2}>

                            <RadioGroup
                              value={item.limitType} // "Value" or "Percentage"
                              onChange={(val: any) => {
                                handleChange(
                                  { target: { name: "limitType", value: val } } as any,
                                  index,
                                  "limitType"
                                );
                              }}
                              isDisabled={!isEdit[index]}
                            >
                              <Stack direction="row" spacing={4}>
                                <Radio value="Value" fontSize={'14px'}><Text as="span" fontSize="14px">Value</Text></Radio>
                                <Radio value="Percentage" fontSize={'14px'}><Text as="span" fontSize="14px">Percentage</Text></Radio>
                              </Stack>
                            </RadioGroup>

                            <Input
                              type="number"
                              size='sm'
                              placeholder="Enter value "
                              border="1px solid #E2E8F0"
                              value={item.limitValue}
                              disabled={!isEdit[index]}
                              onChange={(e) => {
                                let value = Number(e.target.value);
                                // enforce max check
                                if (item.limitType === "Percentage" && value > 100) {
                                  value = 100;
                                  return;
                                }

                                handleChange(e, index, "limitValue")

                              }}
                              style={{
                                border: "1px solid #E2E8F0",
                                borderRadius: "4px",
                                padding: "4px 8px",
                                width: "250px"
                              }}
                            />
                          </Box>
                        </Td>
                        <Td>
                          {format(new Date(item?.updatedAt), 'dd/MM/yyyy, hh:mm a')}
                          {/* {new Date(item.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })} */}
                        </Td>
                        <Td textAlign={"end"}>
                          {
                            isEdit[index] ? <Flex gap={2} justifyContent={"end"}>
                              <Button
                                sx={{
                                  fontSize: '14px',
                                  fontWeight: '500'
                                }}
                                onClick={() => {
                                  saveChanges(item, index)
                                }}
                                size='sm'
                                colorScheme='blue'
                              >
                                Save
                              </Button>
                              <Button
                                colorScheme="gray"
                                fontWeight={500}
                                size='sm'
                                onClick={() => {
                                  setEdit((pre: any) => {
                                    return {
                                      // ...pre,
                                      [index]: false
                                    }
                                  })
                                }}
                              >
                                Cancel
                              </Button>
                            </Flex>
                              :
                              <Button
                                colorScheme="gray"
                                size='sm'
                                onClick={() => {
                                  setEdit((pre: any) => {
                                    return {
                                      // ...pre,
                                      [index]: true
                                    }
                                  })
                                }}
                              >
                                <Image src={"/icons/edit.svg"} alt="edit" cursor="pointer" />
                              </Button>
                          }
                        </Td>
                      </Tr>
                    ))
                  )

              }

            </Tbody>
          </Table>
        </TableContainer >

      </Box >
    </div >
  );
};

export default ThresholdEmail;
