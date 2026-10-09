import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Text,
  VStack,
  Box,
  Radio,
  RadioGroup,
  Button,
  Spinner,
} from '@chakra-ui/react';
import { callApi } from '../../services/callApi';

interface PaymentMethodInfo {
  paymentMethod: string;
  cardBrand: string | null;
  cardLastFour: string | null;
  updatePaymentMethodUrl: string | null;
}

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSubmitting?: boolean;
  onConfirm: (useNewCard: boolean, updatePaymentMethodUrl: string | null) => void;
}

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  isOpen,
  onClose,
  isSubmitting = false,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<PaymentMethodInfo | null>(null);
  const [choice, setChoice] = useState<'saved' | 'new'>('saved');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setInfo(null);
    callApi('lemon/payment-method-info', 'GET', undefined)
      .then((res) => setInfo(res))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const savedCardLabel = info?.cardLastFour
    ? `Use saved card${info.cardBrand ? ` (${info.cardBrand.toUpperCase()})` : ''} ending in ${info.cardLastFour}`
    : 'Use saved card on file';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(2px)" />
      <ModalContent border="1px solid #DEE2E6" borderRadius="md" p={2}>
        <ModalHeader fontSize="18px" fontWeight="700">
          Confirm payment method
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {loading ? (
            <VStack py={6}>
              <Spinner />
            </VStack>
          ) : (
            <RadioGroup value={choice} onChange={(v) => setChoice(v as 'saved' | 'new')}>
              <VStack align="start" spacing={4}>
                <Radio value="saved">
                  <Text fontSize="15px">{savedCardLabel}</Text>
                </Radio>
                <Radio value="new">
                  <Text fontSize="15px">Pay with a new card</Text>
                </Radio>
              </VStack>
            </RadioGroup>
          )}
          {choice === 'new' && !loading && (
            <Box mt={4} bg="#F7FAFC" p={3} borderRadius="md">
              <Text fontSize="13px" color="gray.600">
                You will be asked to enter your new card details first. Your
                plan will be upgraded automatically once the card is saved.
              </Text>
            </Box>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" mr={3} onClick={onClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            isLoading={isSubmitting}
            isDisabled={loading}
            onClick={() => onConfirm(choice === 'new', info?.updatePaymentMethodUrl || null)}
          >
            Continue
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PaymentMethodModal;
